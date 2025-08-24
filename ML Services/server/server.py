import joblib
import pandas as pd
from flask import Flask, request, jsonify


app = Flask(__name__)


try:
    model = joblib.load("ship_speed_regressor.pkl")
    print("✅ Model loaded successfully.")
except FileNotFoundError:
    print("❌ Error: 'ship_speed_regressor.pkl' not found. Make sure the model file is in the same directory.")
    model = None

MODEL_COLUMNS = [
    'wind_direction', 
    'wind_speed', 
    'pressure', 
    'wave_height', 
    'visibility', 
    'sea_surface_temp'
]


@app.route('/predict', methods=['POST'])
def predict_speed():
    """
    Receives weather data, makes a prediction, and returns the predicted ship speed.
    """
    if model is None:
        return jsonify({"error": "Model is not loaded."}), 500

    # Get the JSON data from the request
    json_data = request.get_json()
    if not json_data:
        return jsonify({"error": "Invalid input: No JSON data received."}), 400

    try:
        input_df = pd.DataFrame([json_data])
        
        # Ensure the columns are in the correct order
        input_df = input_df[MODEL_COLUMNS]

        prediction = model.predict(input_df)

        predicted_speed = prediction[0]

        return jsonify({"predicted_ship_speed_knots": round(predicted_speed, 2)})

    except KeyError as e:
        return jsonify({"error": f"Missing required field: {str(e)}"}), 4001
    except Exception as e:
        return jsonify({"error": f"An error occurred during prediction: {str(e)}"}), 500

if __name__ == '__main__':
    # For production, we have to use a WSGI server like Gunicorn.
    app.run(debug=True, port=5000)

