import os
import sys
import re

def update_urls(directory, old_urls, new_url):
    print(f"Updating API URLs in {directory} to {new_url}...")
    
    # Ensure new_url does not end with a trailing slash for consistency
    if new_url.endswith('/'):
        new_url = new_url[:-1]
        
    updated_files = 0
    
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.js'):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()
                        
                    original_content = content
                    
                    for old_url in old_urls:
                        # Replace exact matches of old_url
                        content = content.replace(f"'{old_url}'", f"'{new_url}'")
                        content = content.replace(f'"{old_url}"', f'"{new_url}"')
                        content = content.replace(f"`{old_url}`", f"`{new_url}`")
                        
                        # Replace cases where it is part of a fetch string
                        # e.g., fetch('http://localhost:5001/api/...') -> fetch('https://newurl.com/api/...')
                        content = content.replace(f"'{old_url}/", f"'{new_url}/")
                        content = content.replace(f'"{old_url}/', f'"{new_url}/')
                        content = content.replace(f"`{old_url}/", f"`{new_url}/")

                    if content != original_content:
                        with open(filepath, 'w', encoding='utf-8') as f:
                            f.write(content)
                        print(f"✅ Updated {filepath}")
                        updated_files += 1
                except Exception as e:
                    print(f"❌ Failed to process {filepath}: {e}")
                    
    print(f"\nDone! {updated_files} file(s) updated.")

if __name__ == "__main__":
    print("Welcome to the Frontend API URL Updater!")
    print("This script will update all your JS files to point to your new production backend.")
    print("Example: https://samruddi-backend.onrender.com/api\n")
    
    new_backend_url = input("Enter your production backend API URL: ").strip()
    
    if not new_backend_url:
        print("No URL provided. Exiting.")
        sys.exit(1)
        
    js_dir = os.path.join(os.path.dirname(__file__), 'js')
    
    if not os.path.exists(js_dir):
        print(f"Error: Could not find the 'js' directory at {js_dir}")
        sys.exit(1)
        
    urls_to_replace = [
        "http://localhost:5001/api",
        "/api"
    ]
    
    update_urls(js_dir, urls_to_replace, new_backend_url)
