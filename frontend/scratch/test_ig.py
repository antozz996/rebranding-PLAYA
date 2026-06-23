import instaloader
import sys

def check_profile(username):
    L = instaloader.Instaloader()
    try:
        print(f"Loading profile: {username}")
        profile = instaloader.Profile.from_username(L.context, username)
        print(f"Username: {profile.username}")
        print(f"Full Name: {profile.full_name}")
        print(f"Biography: {profile.biography}")
        print(f"Followers: {profile.followers}")
        print(f"External URL: {profile.external_url}")
    except Exception as e:
        print(f"Error loading profile {username}: {e}", file=sys.stderr)

if __name__ == "__main__":
    check_profile("damai_eventgarden")
