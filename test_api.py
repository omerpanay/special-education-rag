import httpx

def run():
    client = httpx.Client(base_url="http://localhost:8000/api/v1")
    res = client.post("/auth/login", data={"username": "test@edurag.com", "password": "Test1234!"})
    if res.status_code != 200:
        print("Login failed", res.text)
        return
    token = res.json()["access_token"]
    
    headers = {"Authorization": f"Bearer {token}"}
    res = client.get("/students", headers=headers)
    print("Students list:", res.status_code)
    data = res.json()
    if not data["items"]:
        print("No students found.")
        return
    
    student_id = data["items"][0]["id"]
    print(f"Fetching student {student_id}...")
    
    res = client.get(f"/students/{student_id}", headers=headers)
    print("Get student:", res.status_code, res.text)
    
if __name__ == "__main__":
    run()
