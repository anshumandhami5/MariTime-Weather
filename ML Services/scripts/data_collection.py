import requests, gzip, shutil
base_url = "https://www.ndbc.noaa.gov/data/historical/stdmet/"
station = "41002"   # example station ID
years = [2012, 2013, 2014, 2015, 2016]

for year in years:
    filename = f"{station}h{year}.txt.gz"
    url = base_url + filename
    
    print(f"Downloading {filename}...")
    response = requests.get(url, stream=True)
    if response.status_code == 200:
        with open(filename, 'wb') as f:
            shutil.copyfileobj(response.raw, f)
        # Unzip
        with gzip.open(filename, 'rb') as f_in:
            with open(f"{station}_{year}.txt", 'wb') as f_out:
                shutil.copyfileobj(f_in, f_out)
        print(f"Saved {station}_{year}.txt")
    else:
        print(f"{filename} not found")