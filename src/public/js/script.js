document.getElementById("registerButton").addEventListener("click", register);
document.getElementById("loginButton").addEventListener("click", login);
document.getElementById("calcAreaBtn").addEventListener("click", calculateArea);
document.getElementById("calcPerimeterBtn").addEventListener("click", calculatePerimeter);
document.getElementById("logoutBtn").addEventListener("click", logout);

function showMessage(message, isError = false) {
    const messageElement = document.getElementById("message");
    messageElement.textContent = message;
    messageElement.style.color = isError ? "red" : "green";
}
 
async function register() {
    // Retrieve the username from the input field
    const username = document.getElementById("username").value;
    showMessage("Starting registration...", false);
 
    try {
        // Get registration options from your server. Here, we also receive the challenge.
        const response = await fetch("/api/passkey/registerStart", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: username }),
        });
        
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Server responded with ${response.status}: ${errText}`);
        }

        // Convert the registration options to JSON.
        const options = await response.json();
        console.log("Registration Options:", options);
 
        // This triggers the browser to display the passkey / WebAuthn modal (e.g. Face ID, Touch ID, Windows Hello).
        // A new attestation is created. This also means a new public-private-key pair is created.
        let attestationResponse;
        try {
            attestationResponse = await SimpleWebAuthnBrowser.startRegistration(options);
            console.log("Attestation Response:", attestationResponse);
        } catch (webAuthnError) {
            console.error("WebAuthn Error:", webAuthnError);
            alert("WebAuthn failed: " + webAuthnError.message + "\nSee console for details.");
            throw webAuthnError;
        }
 
        // Send attestationResponse back to server for verification and storage.
        const verificationResponse = await fetch("/api/passkey/registerFinish", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(attestationResponse),
        });
 
        if (verificationResponse.ok) {
            showMessage("Registration successful");
            alert("Registration Successful!");
        } else {
            const errorText = await verificationResponse.text();
            console.error("Verification failed:", errorText);
            showMessage("Registration failed: " + errorText, true);
            alert("Server verification failed: " + errorText);
        }
    } catch (error) {
        console.error("General Error:", error);
        showMessage("Error: " + error.message, true);
    }
}
 
async function login() {
    // Retrieve the username from the input field
    const username = document.getElementById("username").value;
 
    try {
        // Get login options from your server. Here, we also receive the challenge.
        const response = await fetch("/api/passkey/loginStart", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: username }),
        });
        // Check if the login options are ok.
        if (!response.ok) {
             const errText = await response.text();
             throw new Error(`Server responded with ${response.status}: ${errText}`);
        }
        // Convert the login options to JSON.
        const options = await response.json();
        console.log("Login Options:", options);
 
        // This triggers the browser to display the passkey / WebAuthn modal (e.g. Face ID, Touch ID, Windows Hello).
        // A new assertionResponse is created. This also means that the challenge has been signed.
        let assertionResponse;
        try {
             assertionResponse = await SimpleWebAuthnBrowser.startAuthentication({ optionsJSON: options });
             console.log("Assertion Response:", assertionResponse);
        } catch (webAuthnError) {
             console.error("WebAuthn Login Error:", webAuthnError);
             alert("WebAuthn Login failed: " + webAuthnError.message);
             throw webAuthnError;
        }
 
        // Send assertionResponse back to server for verification.
        const verificationResponse = await fetch("/api/passkey/loginFinish", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(assertionResponse),
        });
 
        if (verificationResponse.ok) {
            showMessage("Login successful");
            // alert("Login Successful!"); // Optional: Remove or keep alert
            
            // Switch UI
            document.getElementById("auth-container").style.display = "none";
            document.getElementById("calculator-container").style.display = "block";
        } else {
            const errorText = await verificationResponse.text();
            console.error("Login Verification failed:", errorText);
            showMessage("Login failed: " + errorText, true);
            alert("Login Verification failed: " + errorText);
        }
    } catch (error) {
        console.error("General Login Error:", error);
        showMessage("Error: " + error.message, true);
    }
}
function calculateArea() {
    const radius = parseFloat(document.getElementById('circleRadius').value);
    if (isNaN(radius)) {
        document.getElementById('calcResult').textContent = 'Please enter a valid number for radius.';
        return;
    }
    const area = Math.PI * radius * radius;
    document.getElementById('calcResult').textContent = 'Area: ' + area.toFixed(2);
}

function calculatePerimeter() {
    const radius = parseFloat(document.getElementById('circleRadius').value);
    if (isNaN(radius)) {
        document.getElementById('calcResult').textContent = 'Please enter a valid number for radius.';
        return;
    }
    const perimeter = 2 * Math.PI * radius;
    document.getElementById('calcResult').textContent = 'Perimeter: ' + perimeter.toFixed(2);
}

function logout() {
    document.getElementById('auth-container').style.display = 'block';
    document.getElementById('calculator-container').style.display = 'none';
    document.getElementById('username').value = '';
    document.getElementById('circleRadius').value = '';
    document.getElementById('calcResult').textContent = '';
    showMessage('');
}

