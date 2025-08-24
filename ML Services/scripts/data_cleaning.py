import pandas as pd
import numpy as np


INPUT_FILE = "icoads_2016_data.csv" 

OUTPUT_FILE = "cleaned_dataset.csv"

def clean_and_decode_data(input_path, output_path):
    """
    Reads a CSV, renames columns, decodes/rescales values, fills missing data,
    and saves the cleaned data.
    """
    print(f"Reading data from '{input_path}'...")
    
    try:
        # Read the CSV file, treating empty spaces as missing data.
        df = pd.read_csv(input_path, na_values=[' '])
    except FileNotFoundError:
        print(f"Error: The file '{input_path}' was not found. Please check the filename.")
        return

    print("Data loaded successfully.")

    # Rename the column headings.

    new_column_names = {
        'wind_direction_true': 'wind_direction',
        'wind_speed': 'wind_speed',
        'sea_level_pressure': 'pressure',
        'wave_height': 'wave_height',
        'visibility': 'visibility',
        'ship_speed': 'ship_speed',
        'sea_surface_temp': 'sea_surface_temp'
    }
    
    df.rename(columns=new_column_names, inplace=True)
    print("Columns renamed.")

    # Decode the ship_speed WMO codes into the average of the speed range in knots.
    print("\nDecoding ship speed codes...")
    speed_range_map = {
        0: [0, 0], 1: [1, 5], 2: [6, 10], 3: [11, 15], 4: [16, 20],
        5: [21, 25], 6: [26, 30], 7: [31, 35], 8: [36, 40], 9: [41, 45]
    }
    speed_average_map = {code: np.mean(speed_range) for code, speed_range in speed_range_map.items()}
    df['ship_speed'] = df['ship_speed'].map(speed_average_map)
    print("Ship speed decoded to average knots.")

    # Convert scaled columns to their actual units ---
    print("\nConverting scaled integer values...")
    # Divide by 10 to get the actual value in m/s and degrees Celsius
    df['wind_speed'] = df['wind_speed'] / 10
    df['sea_surface_temp'] = df['sea_surface_temp'] / 10
    print("wind_speed and sea_surface_temp columns have been correctly scaled.")

    # Fill missing data with the mean value for each numeric column.
    print("\nFilling missing values with the mean...")
    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]):
            mean_value = df[col].mean()
            df[col].fillna(mean_value, inplace=True)
            print(f"  - Filled missing values in '{col}' with mean: {mean_value:.2f}")

    # Save the cleaned dataset to a new CSV file.
    df.to_csv(output_path, index=False)
    print(f"\n✅ Cleaned data has been saved to '{output_path}'")

    # --- Verification ---
    print("\n--- First 5 rows of the cleaned dataset ---")
    print(df.head())

    print("\n--- Missing values check after cleaning ---")
    print(df.isna().sum())


if __name__ == "__main__":
    clean_and_decode_data(INPUT_FILE, OUTPUT_FILE)
