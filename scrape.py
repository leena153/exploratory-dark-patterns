from fastapi import FastAPI, HTTPException
from concurrent.futures import ThreadPoolExecutor
import time
import random
import requests
from bs4 import BeautifulSoup
import pandas as pd
import os
from datetime import datetime
import csv
from pydantic import BaseModel


app = FastAPI()

class DataItem(BaseModel):
    parent_url: str
    child_link: str
    content: str

with open("user_agents.txt", "r") as f:
    user_agents = [line.strip() for line in f.readlines()]


def read_csv_and_extract_urls(path_to_csv, url_column_idx=6):
    df = pd.read_csv(path_to_csv)
    urls = df.iloc[:, url_column_idx].tolist()
    print(urls)
    return urls


def get_headers():
    return {
        "User-Agent": random.choice(user_agents),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Referer": "https://www.amazon.in/",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "DNT": "1",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-User": "?1",
        "TE": "trailers",
        "Pragma": "no-cache",
        "Cache-Control": "no-cache",
    }


def scrape_reviews(product_url):
    headers = get_headers()
    try:
        response = requests.get(product_url, headers=headers, timeout=10)
        response.raise_for_status()
        html = response.text
        soup = BeautifulSoup(html, "html.parser")

        IGNORE_ELEMENTS = ["script", "style", "noscript", "br", "hr"]

        for element in IGNORE_ELEMENTS:
            for tag in soup.find_all(element):
                tag.decompose()

        text = soup.get_text(separator=" ", strip=True)
        return text
    except requests.RequestException as e:
        print(f"Request failed for {product_url}: {e}")
        return None


def create_dir_if_not_exist(directory):
    if not os.path.exists(directory):
        os.makedirs(directory)


def formatDate(date):
    return date.strftime("%Y-%m-%d")


def slice_into_chunks(lst, chunk_size):
    for i in range(0, len(lst), chunk_size):
        yield lst[i : i + chunk_size]

def save_to_csv(data, file_path):
    with open(file_path, "w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerows(data)

def scrape_reviews_threaded(url_list, output_dir, chunk_size=5):
    start_time = time.time()

    today_str = formatDate(datetime.now())
    dir_to_save = os.path.join(output_dir, today_str)
    create_dir_if_not_exist(dir_to_save)

    url_chunks = list(slice_into_chunks(url_list, chunk_size))
    results = []

    with ThreadPoolExecutor(max_workers=chunk_size) as executor:
        for chunk_idx, url_chunk in enumerate(url_chunks):
            future_to_url = {
                executor.submit(scrape_reviews, url): url for url in url_chunk
            }
            for future in future_to_url:
                url = future_to_url[future]
                page_id = str(
                    chunk_idx * chunk_size
                    + list(future_to_url.keys()).index(future)
                    + 1
                )
                dir_to_save_per_page = os.path.join(dir_to_save, page_id)
                create_dir_if_not_exist(dir_to_save_per_page)

                try:
                    text = future.result()
                    if text:
                        results.append([page_id, text, url])
                except Exception as e:
                    print(f"Error scraping {url}: {e}")

    tsv_file_path = os.path.join(dir_to_save, f"results_{today_str}.tsv")
    save_to_csv(results, tsv_file_path)

    end_time = time.time()
    print(
        f"Scraping reviews using ThreadPoolExecutor with map took {end_time - start_time:.2f} seconds"
    )
    print(f"Results saved to {tsv_file_path}")
    return tsv_file_path


@app.post("/scraper")
async def scrape():
    # list_of_urls = read_csv_and_extract_urls("dark-patterns.csv")
    output_dir = "output"
    list_of_urls = [
        "https://www.fashionworld.co.uk/shop/black-maxi-faux-fur-coat/dr491/product/details/show.action?pdBoUid=1015&optionColour=Black&pdpClick=true",
        "https://www.fashionworld.co.uk/shop/albza-closed-toe-slippers-wide-e-fit-simply-comfort/yf715/product/details/show.action?pdBoUid=1015&optionColour=Grey&pdpClick=true",
    ]
    csv_file_path = scrape_reviews_threaded(list_of_urls, output_dir)
    print("Saved to", csv_file_path)
    return {"message": "Scraping completed successfully."}


@app.post("/post")
async def save_data_csv(data: DataItem):
    try:
        output_dir = "output"
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)

        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")

        csv_filename = f"{output_dir}/data_{timestamp}.csv"
        
        with open(csv_filename, mode='w', newline='', encoding='utf-8') as file:
            writer = csv.writer(file)
                     
            if os.stat(csv_filename).st_size == 0:
                writer.writerow(["Parent URL", "Child Link", "Content"])
            writer.writerow([data.parent_url, data.child_link, data.content])

        return {"message": "Data saved successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save data: {str(e)}")



if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
