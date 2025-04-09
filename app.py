from flask import Flask, request, jsonify
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import load_model
from PIL import Image
import io
from flask_cors import CORS  # Allow frontend-backend communication

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Load the trained model
model = load_model("new_model.h5")
model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])

# Define class labels (Update according to your dataset)
class_labels = [
    "अ", "अं", "अः", "आ", "इ", "ई", "उ", "ऊ", "ऋ", "ए",
    "ऐ", "ओ", "औ", "क", "कं", "कः", "का", "कि", "की", "कु",
    "कू", "के", "कै", "को", "कौ", "ख", "खं", "खः", "खा", "खि",
    "खी", "खु", "खू", "खे", "खै", "खो", "खौ", "ग", "गं", "गः",
    "गा", "गि", "गी", "गु", "गू", "गे", "गै", "गो", "गौ", "घ",
    "घं", "घः", "घा", "घि", "घी", "घु", "घू", "घे", "घै", "घो",
    "ङ", "च", "चं", "चः", "चा", "चि", "ची", "चु", "चू", "चे",
    "चै", "चो", "चौ", "छ", "छं", "छः", "छा", "छि", "छी", "छु",
    "छू", "छे", "छै", "छो", "छौ", "ज", "जं", "जः", "जा", "जि",
    "जी", "जु", "जू", "जे", "जै", "जो", "जौ", "झ", "झं", "झः",
    "झा", "झि", "झी", "झु", "झू", "झे", "झै", "झो", "झौ", "ञ",
    "ट", "टं", "टः", "टा", "टि", "टी", "टु", "टू", "टे", "टै",
    "टो", "टौ", "ठ", "ठं", "ठः", "ठा", "ठि", "ठी", "ठु", "ठू",
    "ठे", "ठै", "ठो", "ठौ", "ड", "डं", "डः", "डा", "डि", "डी",
    "डु", "डू", "डे", "डै", "डो", "डौ", "ढ", "ढं", "ढः", "ढा",
    "ढि", "ढी", "ढु", "ढू", "ढे", "ढै", "ढो", "ढौ", "ण", "णं",
    "णः", "णा", "णि", "णी", "णु", "णू", "णे", "णै", "णो", "णौ",
    "त", "तं", "तः", "ता", "ति", "ती", "तु", "तू", "ते", "तै",
    "तो", "तौ", "थ", "थं", "थः", "था", "थि", "थी", "थु", "थू",
    "थे", "थै", "थो", "थौ", "द", "दं", "दः", "दा", "दि", "दी",
    "दु", "दू", "दे", "दै", "दो", "दौ", "ध", "धं", "धः", "धा",
    "धि", "धी", "धु", "धू", "धे", "धै", "धो", "धौ", "न", "नं",
    "नः", "ना", "नि", "नी", "नु", "नू", "ने", "नै", "नो", "नौ",
    "प", "पं", "पः", "पा", "पि", "पी", "पु", "पू", "पे", "पै",
    "पो", "पौ", "फ", "फं", "फः", "फा", "फि", "फी", "फु", "फू",
    "फे", "फै", "फो", "फौ", "ब", "बं", "बः", "बा", "बि", "बी",
    "बु", "बू", "बे", "बै", "बो", "बौ", "भ", "भं", "भः", "भा",
    "भि", "भी", "भु", "भू", "भे", "भै", "भो", "भौ", "म", "मं",
    "मः", "मा", "मि", "मी", "मु", "मू", "मे", "मै", "मो", "मौ",
    "य", "यं", "यः", "या", "यि", "यी", "यु", "यू", "ये", "यै",
    "यो", "यौ", "र", "रं", "रः", "रा", "रि", "री", "रे", "रै",
    "रो", "रौ", "ल", "लं", "लः", "ला", "लि", "ली", "लु", "लू",
    "ले", "लै", "लो", "लौ", "व", "वं", "वः", "वा", "वि", "वी",
    "वु", "वू", "वे", "वै", "वो", "वौ", "श", "शं", "शः", "शा",
    "शि", "शी", "शु", "शू", "शे", "शै", "शो", "शौ", "ष", "षं",
    "षः", "षा", "षि", "षी", "षु", "षू", "षे", "षै", "षो", "षौ",
    "स", "सं", "सः", "सा", "सि", "सी", "सु", "सू", "से", "सै",
    "सो", "सौ", "ह", "हं", "हः", "हा", "हि", "ही", "हु", "हू",
    "हे", "है", "हो", "हौ"
]  # Modify based on dataset

def preprocess_image(image):
    """Preprocesses the uploaded image for the model."""
    img = Image.open(io.BytesIO(image))  # Read image from bytes
    img = img.convert('L')  # Convert to grayscale
    img = img.resize((32, 32))  # Resize to 32x32
    img_array = np.array(img) / 255.0  # Normalize pixel values (0 to 1)
    img_array = np.expand_dims(img_array, axis=0)  # Add batch dimension
    img_array = np.expand_dims(img_array, axis=-1)  # Add channel dimension
    return img_array

@app.route("/predict", methods=["POST"])
def predict():
    """Handles prediction requests."""
    if "image" not in request.files:
        return jsonify({"error": "No image uploaded"}), 400

    try:
        image = request.files["image"].read()
        processed_img = preprocess_image(image)
        prediction = model.predict(processed_img)
        predicted_index = np.argmax(prediction)
        predicted_letter = class_labels[predicted_index]

        print(predicted_letter)

        return jsonify({"predicted_letter": predicted_letter})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)