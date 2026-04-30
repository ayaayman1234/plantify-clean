import pytest

from app.api.routes import users


async def _signup_and_login(client, *, email: str, full_name: str, password: str, payload_extra: dict | None = None) -> str:
    payload = {
        "email": email,
        "full_name": full_name,
        "password": password,
    }
    if payload_extra:
        payload.update(payload_extra)

    signup_response = await client.post("/api/auth/signup", json=payload)
    assert signup_response.status_code == 200

    login_response = await client.post("/api/auth/login", json={"email": email, "password": password})
    assert login_response.status_code == 200
    return login_response.json()["access_token"]


@pytest.mark.asyncio
async def test_expert_signup_creates_pending_application_and_requires_admin_approval(client):
    users.settings.role_elevation_code = "test-admin-code"
    password = "supersecure123"

    admin_token = await _signup_and_login(
        client,
        email="admin@example.com",
        full_name="Admin User",
        password=password,
    )
    elevate_response = await client.post(
        "/api/users/self/role/by-code",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"code": "test-admin-code", "role": "admin"},
    )
    assert elevate_response.status_code == 200

    expert_token = await _signup_and_login(
        client,
        email="expert@apply.com",
        full_name="Dr Expert",
        password=password,
        payload_extra={
            "account_type": "expert",
            "expert_application": {
                "headline": "Tomato disease consultant",
                "phone_number": "+201001234567",
                "about": "I help farmers diagnose fungal and bacterial issues in tomatoes.",
                "credentials": "PhD in plant pathology, licensed agricultural consultant.",
                "years_experience": 8,
            },
        },
    )

    expert_profile_response = await client.get(
        "/api/users/me",
        headers={"Authorization": f"Bearer {expert_token}"},
    )
    assert expert_profile_response.status_code == 200
    expert_profile = expert_profile_response.json()
    assert expert_profile["role"] == "farmer"
    assert expert_profile["expert_application_status"] == "pending"
    assert expert_profile["can_create_posts"] is False

    community_before_approval = await client.post(
        "/api/community/posts",
        headers={"Authorization": f"Bearer {expert_token}"},
        data={
            "plant_name": "Tomato",
            "problem": "Leaves have dark spots",
            "ai_disease": "Early blight",
            "ai_confidence_score": "0.93",
        },
        files={"image": ("leaf.png", b"\x89PNGtest-image", "image/png")},
    )
    assert community_before_approval.status_code == 403

    overview_response = await client.get(
        "/api/admin/overview",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert overview_response.status_code == 200
    overview_payload = overview_response.json()
    assert len(overview_payload["expert_applications"]) == 1
    assert overview_payload["expert_applications"][0]["phone_number"] == "+201001234567"
    application_id = overview_payload["expert_applications"][0]["id"]
    expert_user_id = overview_payload["expert_applications"][0]["user_id"]

    approve_response = await client.post(
        f"/api/admin/expert-applications/{application_id}/approve",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"review_notes": "Verified credentials and accepted."},
    )
    assert approve_response.status_code == 200
    assert approve_response.json()["status"] == "approved"

    expert_profile_after_approval = await client.get(
        "/api/users/me",
        headers={"Authorization": f"Bearer {expert_token}"},
    )
    assert expert_profile_after_approval.status_code == 200
    approved_profile = expert_profile_after_approval.json()
    assert approved_profile["role"] == "expert"
    assert approved_profile["expert_application_status"] == "approved"
    assert approved_profile["can_create_posts"] is True

    own_profile_detail_response = await client.get(
        "/api/users/me/profile",
        headers={"Authorization": f"Bearer {expert_token}"},
    )
    assert own_profile_detail_response.status_code == 200
    own_profile_detail = own_profile_detail_response.json()
    assert own_profile_detail["expert_profile"]["headline"] == "Tomato disease consultant"
    assert own_profile_detail["expert_profile"]["phone_number"] == "+201001234567"
    assert own_profile_detail["expert_profile"]["years_experience"] == 8
    assert own_profile_detail["expert_profile"]["status"] == "approved"

    update_profile_response = await client.patch(
        "/api/users/me/profile",
        headers={"Authorization": f"Bearer {expert_token}"},
        data={
            "full_name": "Dr Expert Updated",
            "role": "expert",
            "headline": "Greenhouse tomato specialist",
            "phone_number": "+201009998887",
            "about": "I support tomato growers with greenhouse disease diagnosis and treatment plans.",
            "credentials": "Plant pathology consultant and greenhouse advisor.",
            "years_experience": "10",
        },
    )
    assert update_profile_response.status_code == 200
    assert update_profile_response.json()["full_name"] == "Dr Expert Updated"

    updated_own_profile_detail_response = await client.get(
        "/api/users/me/profile",
        headers={"Authorization": f"Bearer {expert_token}"},
    )
    assert updated_own_profile_detail_response.status_code == 200
    updated_own_profile_detail = updated_own_profile_detail_response.json()
    assert updated_own_profile_detail["full_name"] == "Dr Expert Updated"
    assert updated_own_profile_detail["expert_profile"]["headline"] == "Greenhouse tomato specialist"
    assert updated_own_profile_detail["expert_profile"]["phone_number"] == "+201009998887"
    assert updated_own_profile_detail["expert_profile"]["years_experience"] == 10

    public_profile_response = await client.get(
        f"/api/users/{expert_user_id}/profile",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert public_profile_response.status_code == 200
    public_profile = public_profile_response.json()
    assert public_profile["full_name"] == "Dr Expert Updated"
    assert public_profile["expert_profile"]["headline"] == "Greenhouse tomato specialist"
    assert public_profile["expert_profile"]["phone_number"] == "+201009998887"
    assert public_profile["expert_profile"]["status"] == "approved"

    experts_directory_response = await client.get(
        "/api/social/experts",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert experts_directory_response.status_code == 200
    experts_directory = experts_directory_response.json()["experts"]
    assert len(experts_directory) == 1
    assert experts_directory[0]["user"]["id"] == expert_user_id
    assert experts_directory[0]["user"]["full_name"] == "Dr Expert Updated"
    assert experts_directory[0]["expert_profile"]["headline"] == "Greenhouse tomato specialist"
    assert experts_directory[0]["expert_profile"]["phone_number"] == "+201009998887"

    disable_posting_response = await client.patch(
        f"/api/users/{expert_user_id}/posting-permission",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"can_create_posts": False},
    )
    assert disable_posting_response.status_code == 200
    assert disable_posting_response.json()["can_create_posts"] is False

    community_after_disable = await client.post(
        "/api/community/posts",
        headers={"Authorization": f"Bearer {expert_token}"},
        data={
            "plant_name": "Tomato",
            "problem": "Leaves have dark spots",
            "ai_disease": "Early blight",
            "ai_confidence_score": "0.93",
        },
        files={"image": ("leaf.png", b"\x89PNGtest-image", "image/png")},
    )
    assert community_after_disable.status_code == 403


@pytest.mark.asyncio
async def test_public_profile_endpoint_returns_user_posts_without_email(client):
    password = "supersecure123"
    viewer_token = await _signup_and_login(
        client,
        email="viewer@example.com",
        full_name="Viewer User",
        password=password,
    )
    author_token = await _signup_and_login(
        client,
        email="author@example.com",
        full_name="Author User",
        password=password,
    )

    author_profile_response = await client.get(
        "/api/users/me",
        headers={"Authorization": f"Bearer {author_token}"},
    )
    author_id = author_profile_response.json()["id"]

    # Author is promoted only to allow posting in this test fixture.
    users.settings.role_elevation_code = "test-admin-code-2"
    elevate_author = await client.post(
        "/api/users/self/role/by-code",
        headers={"Authorization": f"Bearer {author_token}"},
        json={"code": "test-admin-code-2", "role": "admin"},
    )
    assert elevate_author.status_code == 200

    create_post_response = await client.post(
        "/api/community/posts",
        headers={"Authorization": f"Bearer {author_token}"},
        data={
            "plant_name": "Tomato",
            "problem": "Leaves are curling",
            "ai_disease": "Tomato leaf curl",
            "ai_confidence_score": "0.89",
        },
        files={"image": ("leaf.png", b"\x89PNGtest-image", "image/png")},
    )
    assert create_post_response.status_code == 201

    public_profile_response = await client.get(
        f"/api/users/{author_id}/profile",
        headers={"Authorization": f"Bearer {viewer_token}"},
    )
    assert public_profile_response.status_code == 200
    payload = public_profile_response.json()
    assert payload["id"] == author_id
    assert payload["full_name"] == "Author User"
    assert "email" not in payload
    assert payload["posts_count"] == 1


@pytest.mark.asyncio
async def test_admin_can_ban_and_unban_user(client):
    users.settings.role_elevation_code = "test-admin-code-3"
    password = "supersecure123"

    admin_token = await _signup_and_login(
        client,
        email="ban-admin@example.com",
        full_name="Ban Admin",
        password=password,
    )
    elevate_admin = await client.post(
        "/api/users/self/role/by-code",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"code": "test-admin-code-3", "role": "admin"},
    )
    assert elevate_admin.status_code == 200

    target_email = "banned-user@example.com"
    target_password = "supersecure123"
    target_token = await _signup_and_login(
        client,
        email=target_email,
        full_name="Banned User",
        password=target_password,
    )

    target_profile_response = await client.get(
        "/api/users/me",
        headers={"Authorization": f"Bearer {target_token}"},
    )
    assert target_profile_response.status_code == 200
    target_user_id = target_profile_response.json()["id"]

    ban_response = await client.post(
        f"/api/admin/users/{target_user_id}/ban",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"reason": "Repeated spam in community posts."},
    )
    assert ban_response.status_code == 200
    assert ban_response.json()["is_banned"] is True
    assert ban_response.json()["banned_reason"] == "Repeated spam in community posts."

    overview_response = await client.get(
        "/api/admin/overview",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert overview_response.status_code == 200
    banned_user = next(user for user in overview_response.json()["users"] if user["id"] == target_user_id)
    assert banned_user["is_banned"] is True
    assert banned_user["banned_reason"] == "Repeated spam in community posts."

    banned_login_response = await client.post(
        "/api/auth/login",
        json={"email": target_email, "password": target_password},
    )
    assert banned_login_response.status_code == 403
    assert banned_login_response.json()["detail"] == "This account has been banned."

    banned_profile_response = await client.get(
        "/api/users/me",
        headers={"Authorization": f"Bearer {target_token}"},
    )
    assert banned_profile_response.status_code == 403
    assert banned_profile_response.json()["detail"] == "This account has been banned."

    unban_response = await client.post(
        f"/api/admin/users/{target_user_id}/unban",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert unban_response.status_code == 200
    assert unban_response.json()["is_banned"] is False
    assert unban_response.json()["banned_reason"] is None

    restored_login_response = await client.post(
        "/api/auth/login",
        json={"email": target_email, "password": target_password},
    )
    assert restored_login_response.status_code == 200


@pytest.mark.asyncio
async def test_user_reports_reach_admin_overview(client):
    users.settings.role_elevation_code = "test-admin-code-4"
    password = "supersecure123"

    admin_token = await _signup_and_login(
        client,
        email="reports-admin@example.com",
        full_name="Reports Admin",
        password=password,
    )
    elevate_admin = await client.post(
        "/api/users/self/role/by-code",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"code": "test-admin-code-4", "role": "admin"},
    )
    assert elevate_admin.status_code == 200

    author_token = await _signup_and_login(
        client,
        email="reported-user@example.com",
        full_name="Reported User",
        password=password,
    )
    reporter_token = await _signup_and_login(
        client,
        email="reporter-user@example.com",
        full_name="Reporter User",
        password=password,
    )

    author_me = await client.get("/api/users/me", headers={"Authorization": f"Bearer {author_token}"})
    assert author_me.status_code == 200
    author_id = author_me.json()["id"]

    elevate_author = await client.post(
        "/api/users/self/role/by-code",
        headers={"Authorization": f"Bearer {author_token}"},
        json={"code": "test-admin-code-4", "role": "admin"},
    )
    assert elevate_author.status_code == 200

    create_post_response = await client.post(
        "/api/community/posts",
        headers={"Authorization": f"Bearer {author_token}"},
        data={
            "plant_name": "Tomato",
            "problem": "Leaves look burned on edges",
            "ai_disease": "Late blight",
            "ai_confidence_score": "0.91",
        },
        files={"image": ("leaf.png", b"\x89PNGtest-image", "image/png")},
    )
    assert create_post_response.status_code == 201
    post_id = create_post_response.json()["id"]

    report_profile_response = await client.post(
        f"/api/users/{author_id}/report",
        headers={"Authorization": f"Bearer {reporter_token}"},
        json={"reason": "This profile is impersonating an agricultural expert."},
    )
    assert report_profile_response.status_code == 201
    assert report_profile_response.json()["report_type"] == "profile"

    report_post_response = await client.post(
        f"/api/community/posts/{post_id}/report",
        headers={"Authorization": f"Bearer {reporter_token}"},
        json={"reason": "This community post contains misleading disease advice."},
    )
    assert report_post_response.status_code == 201
    assert report_post_response.json()["report_type"] == "post"
    assert report_post_response.json()["post_id"] == post_id

    overview_response = await client.get(
        "/api/admin/overview",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert overview_response.status_code == 200
    reports = overview_response.json()["reports"]
    assert len(reports) == 2
    assert any(report["report_type"] == "profile" and report["target_user_id"] == author_id for report in reports)
    post_report = next(report for report in reports if report["report_type"] == "post")
    assert post_report["post_id"] == post_id
    assert post_report["status"] == "open"

    reviewed_response = await client.post(
        f"/api/admin/reports/{post_report['id']}/status",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"status": "reviewed"},
    )
    assert reviewed_response.status_code == 200
    assert reviewed_response.json()["status"] == "reviewed"
