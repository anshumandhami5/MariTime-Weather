import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib

INPUT_FILE = "cleaned_dataset.csv"
MODEL_OUTPUT_FILE = "ship_speed_regressor.pkl"

def train_model(input_path, model_output_path):
    """
    Trains a regression model to predict ship_speed and saves it.
    """
    print(f"1. Loading cleaned dataset from '{input_path}'...")
    try:
        df = pd.read_csv(input_path)
    except FileNotFoundError:
        print(f"Error: The file '{input_path}' was not found. Please run the data cleaning script first.")
        return

    # Define the features (X) and the target (y)
    print("2. Defining features and target variable...")
    # The target is what we want to predict
    y = df['ship_speed']
    # The features are all other columns used for prediction
    X = df.drop(columns=['ship_speed'])

    # Split the data into training and testing sets
    print("3. Splitting data into training (80%) and testing (20%) sets...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    # Initialize and train the Random Forest Regressor model
    print("4. Training the Random Forest Regressor model...")
    # n_estimators is the number of trees in the forest. More trees can lead to better performance.
    regressor = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
    regressor.fit(X_train, y_train)
    print("Model training complete.")

    #Make predictions on the test set to evaluate the model
    print("\n5. Evaluating model performance on the test set...")
    y_pred = regressor.predict(X_test)

    # Calculate and print performance metrics
    mae = mean_absolute_error(y_test, y_pred)
    mse = mean_squared_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)

    print(f"  - Mean Absolute Error (MAE): {mae:.2f} knots")
    print(f"    (On average, the model's prediction is off by about {mae:.2f} knots)")
    print(f"  - Mean Squared Error (MSE): {mse:.2f}")
    print(f"  - R-squared (R²): {r2:.2f}")
    print(f"    (The model explains about {r2*100:.0f}% of the variance in the ship speed data)")

    # Save the trained model to a file
    joblib.dump(regressor, model_output_path)
    print(f"\n✅ Model has been saved to '{model_output_path}'")


if __name__ == "__main__":
    train_model(INPUT_FILE, MODEL_OUTPUT_FILE)
