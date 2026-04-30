import pytest


async def _signup_and_login(client, *, email: str, full_name: str, password: str) -> str:
    signup_response = await client.post(
        "/api/auth/signup",
        json={"email": email, "full_name": full_name, "password": password},
    )
    assert signup_response.status_code == 200

    login_response = await client.post(
        "/api/auth/login",
        json={"email": email, "password": password},
    )
    assert login_response.status_code == 200
    return login_response.json()["access_token"]


@pytest.mark.asyncio
async def test_social_friend_request_and_direct_messages_flow(client):
    password = "supersecure123"
    farmer_token = await _signup_and_login(
        client,
        email="farmer-social@example.com",
        full_name="Farmer Social",
        password=password,
    )
    expert_token = await _signup_and_login(
        client,
        email="expert-social@example.com",
        full_name="Expert Social",
        password=password,
    )

    expert_profile_response = await client.get(
        "/api/users/me",
        headers={"Authorization": f"Bearer {expert_token}"},
    )
    assert expert_profile_response.status_code == 200
    expert_id = expert_profile_response.json()["id"]

    send_request_response = await client.post(
        "/api/social/friend-requests",
        headers={"Authorization": f"Bearer {farmer_token}"},
        json={"receiver_id": expert_id},
    )
    assert send_request_response.status_code == 201
    request_id = send_request_response.json()["id"]

    overview_response = await client.get(
        "/api/social/overview",
        headers={"Authorization": f"Bearer {expert_token}"},
    )
    assert overview_response.status_code == 200
    overview_payload = overview_response.json()
    assert len(overview_payload["received_requests"]) == 1
    assert overview_payload["received_requests"][0]["id"] == request_id

    accept_response = await client.post(
        f"/api/social/friend-requests/{request_id}/accept",
        headers={"Authorization": f"Bearer {expert_token}"},
    )
    assert accept_response.status_code == 200
    assert accept_response.json()["status"] == "accepted"

    message_response = await client.post(
        "/api/social/messages",
        headers={"Authorization": f"Bearer {farmer_token}"},
        json={"receiver_id": expert_id, "body": "Hello from Plantify social!"},
    )
    assert message_response.status_code == 201
    assert message_response.json()["body"] == "Hello from Plantify social!"

    conversation_response = await client.get(
        f"/api/social/conversations/{expert_id}",
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert conversation_response.status_code == 200
    conversation_payload = conversation_response.json()
    assert conversation_payload["friend"]["id"] == expert_id
    assert len(conversation_payload["messages"]) == 1
    assert conversation_payload["messages"][0]["body"] == "Hello from Plantify social!"


@pytest.mark.asyncio
async def test_direct_messages_work_without_friendship_for_community_private_chat(client):
    password = "supersecure123"
    sender_token = await _signup_and_login(
        client,
        email="community-sender@example.com",
        full_name="Community Sender",
        password=password,
    )
    receiver_token = await _signup_and_login(
        client,
        email="community-receiver@example.com",
        full_name="Community Receiver",
        password=password,
    )

    receiver_profile_response = await client.get(
        "/api/users/me",
        headers={"Authorization": f"Bearer {receiver_token}"},
    )
    assert receiver_profile_response.status_code == 200
    receiver_id = receiver_profile_response.json()["id"]

    message_response = await client.post(
        "/api/social/messages",
        headers={"Authorization": f"Bearer {sender_token}"},
        json={"receiver_id": receiver_id, "body": "Private question from community"},
    )
    assert message_response.status_code == 201
    assert message_response.json()["body"] == "Private question from community"

    conversation_response = await client.get(
        f"/api/social/conversations/{receiver_id}",
        headers={"Authorization": f"Bearer {sender_token}"},
    )
    assert conversation_response.status_code == 200
    conversation_payload = conversation_response.json()
    assert conversation_payload["friend"]["id"] == receiver_id
    assert conversation_payload["friend"]["friendship_status"] == "none"
    assert len(conversation_payload["messages"]) == 1
