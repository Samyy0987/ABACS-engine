import requests
import re
from urllib.parse import urljoin

headers = {'User-Agent': 'Mozilla/5.0'}
try:
    r = requests.get('https://sanjivani.edu.in', headers=headers, timeout=10)
    matches = re.findall(r'src=["\']([^"\']+\.(?:png|jpg|jpeg|svg))["\']', r.text, re.IGNORECASE)
    print("Found images:", len(matches))
    for m in matches:
        if 'logo' in m.lower():
            full_url = urljoin('https://sanjivani.edu.in', m)
            print("Logo candidate:", full_url)
            img_r = requests.get(full_url, headers=headers, timeout=10)
            if img_r.status_code == 200:
                with open('sanjivani_logo.png', 'wb') as f:
                    f.write(img_r.content)
                print("Downloaded logo successfully to sanjivani_logo.png!")
                break
except Exception as e:
    print("Error:", e)
