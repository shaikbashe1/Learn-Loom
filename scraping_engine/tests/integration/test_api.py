import pytest


@pytest.mark.asyncio
async def test_health_endpoint(client):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "version" in data


@pytest.mark.asyncio
async def test_list_categories(client):
    response = await client.get("/api/v1/categories")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_list_resources_empty(client):
    response = await client.get("/api/v1/resources")
    assert response.status_code == 200
    body = response.json()
    assert "items" in body
    assert "total" in body
    assert "page" in body


@pytest.mark.asyncio
async def test_search_resources(client):
    response = await client.get("/api/v1/search?q=python")
    assert response.status_code == 200
    body = response.json()
    assert "items" in body


@pytest.mark.asyncio
async def test_search_requires_min_length(client):
    response = await client.get("/api/v1/search?q=p")
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_resource_not_found(client):
    response = await client.get("/api/v1/resources/99999")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_trending_resources(client):
    response = await client.get("/api/v1/resources/trending")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_pagination_params(client):
    response = await client.get("/api/v1/resources?page=1&page_size=5")
    assert response.status_code == 200
    body = response.json()
    assert body["page_size"] == 5
