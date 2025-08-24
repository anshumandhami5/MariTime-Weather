import pandas as pd

# Load first dataset
df1 = pd.read_csv(
    "41002_2012.txt",
    sep=r"\s+",
    header=0,
    usecols=["WDIR", "WSPD", "GST", "VIS", "WVHT","PRES"],
    na_values=[999, 9999, 99.0, 999.0, 99.00, "m/s", "hPa", "mi", "degT", "m"]
)

# Load second dataset
df2 = pd.read_csv(
    "41002_2018.txt",
    sep=r"\s+",
    header=0,
    usecols=["WDIR", "WSPD", "GST", "VIS", "WVHT","PRES"],
    na_values=[999, 9999, 99.0, 999.0, 99.00, "m/s", "hPa", "mi", "degT", "m"]
)

# Concatenate the two datasets
df = pd.concat([df1, df2], ignore_index=True)

# Rename columns
df = df.rename(columns={
    "WDIR": "wind_direction",
    "WSPD": "wind_speed",
    "GST": "wind_gusts",
    "VIS": "visibility",
    "WVHT": "wave_height",
    "PRES": "pressure"
})

numeric_cols = ['wind_direction','wind_speed','wind_gusts','wave_height','pressure']
df[numeric_cols] = df[numeric_cols].apply(pd.to_numeric, errors='coerce')


#  Fill missing values for numeric columns

for col in numeric_cols:
    df[col] = df[col].fillna(df[col].mean())


#    handle visibility data
vis_df = pd.read_csv("visibility_data.csv")

df['visibility'] = pd.to_numeric(df['visibility'], errors='coerce') # Ensure the column is numeric first
df.loc[0:len(vis_df)-1, 'visibility'] = vis_df['visibility']

visibility_mean = df['visibility'].mean()
df['visibility'] = df['visibility'].fillna(visibility_mean)


#  Reset index

df_clean = df.reset_index(drop=True)

df_clean.to_csv("combined_cleaned_dataset.csv", index=False)

# Show first 5 rows
print("First 5 rows of dataset:")
print(df_clean.head())

# Check missing values
print("\nMissing values per column:")
print(df_clean.isna().sum())