from concurrent.futures import ThreadPoolExecutor
import time
import random
import requests
from bs4 import BeautifulSoup
import pandas as pd
import os
from datetime import datetime
import re
import uuid


class Scraper:

    def __init__(self, depth, parent_url):
        self.__load_user_agents()
        self.depth = depth
        self.parent_url = parent_url
        self.parent_domain = self.__extract_parent_domain()
        print("Found parent domain:", self.parent_domain)

        for _ in range(depth):
            child_links = self.__scrape_parent_content_child_links()
            print("Child links:", child_links)

            with ThreadPoolExecutor() as executor:
                for link in child_links:
                    if link is not None or link != "/":
                        final_link = (
                            self.parent_domain + link if link.startswith("/") else link
                        )
                        executor.submit(
                            self.__scrape_child_content,
                            final_link,
                        )

    def __load_user_agents(self):
        with open("user_agents.txt", "r") as f:
            self.user_agents = [line.strip() for line in f.readlines()]

    def __get_headers(self):
        return {
            "User-Agent": random.choice(self.user_agents),
            "Accept": "*/*",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate, br",
            "DNT": "1",
            "Origin": self.parent_domain,
            "Referer": self.parent_url,
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-site",
            "Sec-Fetch-User": "?1",
            "TE": "trailers",
            "Pragma": "no-cache",
            "Cache-Control": "no-cache",
        }

    def __scrape_parent_content_child_links(self):
        headers = self.__get_headers()
        response = requests.get(self.parent_url, headers=headers, timeout=10)
        links = []

        html = response.text
        soup = BeautifulSoup(html, "html.parser")
        IGNORE_ELEMENTS = ["script", "style", "noscript", "br", "hr"]

        for data in soup(IGNORE_ELEMENTS):
            data.decompose()

        text = " ".join(soup.stripped_strings)

        timestamp = int(time.time())
        unique_id = str(uuid.uuid4())
        filename = f"output/{timestamp}_{unique_id}.txt"
        with open(filename, "w") as file:
            file.write(f"Text:\n{text}\n")

        for link in soup.find_all("a"):
            href = link.get("href")
            links.append(href)
        return links

    def __scrape_child_content(self, url):
        headers = self.__get_headers()
        try:
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            html = response.text
            soup = BeautifulSoup(html, "html.parser")

            IGNORE_ELEMENTS = ["script", "style", "noscript", "br", "hr"]

            for element in IGNORE_ELEMENTS:
                for tag in soup.find_all(element):
                    tag.decompose()

            text = soup.get_text(separator=" ", strip=True)

            timestamp = int(time.time())
            unique_id = str(uuid.uuid4())
            filename = f"output/{timestamp}_{unique_id}.txt"
            with open(filename, "w") as file:
                file.write(f"Text:\n{text}\n")

        except requests.RequestException as e:
            print(f"Request failed for {url}: {e}")
            return None

    def __extract_parent_domain(self):
        return (
            re.findall(r"https?://(?:[-\w.]|(?:%[\da-fA-F]{2}))+", self.parent_url)[0]
            if self.parent_url
            else None
        )


sc = Scraper(
    1,
    "https://www.myntra.com/cargo?rawQuery=cargo",
)
