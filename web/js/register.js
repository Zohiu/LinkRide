const apiURL = "https://linkride.stuehrwoldt.de/api/";

const codes = {
    SUCCESS: -1,
    EMAIL_EXISTS: 0,
    COURSE_NOT_FOUND: 1,
    INVALID_EMAIL: 2,
    INVALID_PASSWORD: 3,
    INVALID_FIRST_NAME: 4,
    INVALID_LAST_NAME: 5,
    INVALID_ADDRESS: 6,
    PASSWORD_INCORRECT: 7,
    PASSWORDS_ARE_THE_SAME: 8,
}


let registerForm = document.getElementById("register");
let outputElement = document.getElementById("output");

let email = document.getElementById("email");
email.addEventListener('input', () => { email.setCustomValidity(''); });
let password = document.getElementById("password");
password.addEventListener('input', () => { password.setCustomValidity(''); });
let fname = document.getElementById("fname");
fname.addEventListener('input', () => { fname.setCustomValidity(''); });
let lname = document.getElementById("lname");
lname.addEventListener('input', () => { lname.setCustomValidity(''); });
let course = document.getElementById("course");
course.addEventListener('input', () => { course.setCustomValidity(''); });
let pcode = document.getElementById("pcode");
pcode.addEventListener('input', () => { pcode.setCustomValidity(''); });
let town = document.getElementById("town");
town.addEventListener('input', () => { town.setCustomValidity(''); });
let street = document.getElementById("street");
street.addEventListener('input', () => { street.setCustomValidity(''); });


let loadingElement = document.getElementById("loading")
let loadingImage = `<img src="assets/loading.svg" class="ld ld-fade-in" />`

let checkElement = document.getElementById("check")
let checkImage = `<img src="assets/check.svg" class="ld ld-fall-ttb-in" />`
let checkText = `
<br>
<h1 class="gradient-text ld ld-fade-in">Du wirst gleich<br>weitergeleitet.</h1>
<p>Oder klicke <a href="panel.html">hier</a></p>
`

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}


registerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    showLoading()

    var body = {
        password: {
            password: password.value,
        },
        user: {
            email: email.value,
            first_name: fname.value,
            last_name: lname.value,
            untis_course_name: course.value,
            postal_code: pcode.value,
            town: town.value,
            street_and_house: street.value,
        }
    };

    let requestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    };

    fetch(apiURL + "user", requestOptions)
    .then(response => {
        return response.json();
    })
    .then(data => {
        hideLoading();

        if (data.hasOwnProperty("error_code")) {
            let code = data.error_code;

            if (code == codes.INVALID_EMAIL) {
                email.setCustomValidity("Bitte gebe eine eche E-Mail an.");
                email.reportValidity();

            } else if (code == codes.EMAIL_EXISTS) {
                email.setCustomValidity("Ein Konto mit dieser E-Mail existiert bereits.");
                email.reportValidity();

            } else if (code == codes.INVALID_PASSWORD) {
                password.setCustomValidity("Passwort muss 6-20 Zeichen mit Zahl, Sonderzeichen, Groß- und Kleinbuchstaben sein.");
                password.reportValidity();

            } else if (code == codes.INVALID_FIRST_NAME) {
                fname.setCustomValidity("2-25 Zeichen benötigt");
                fname.reportValidity();
            
            } else if (code == codes.INVALID_LAST_NAME) {
                lname.setCustomValidity("2-25 Zeichen benötigt");
                lname.reportValidity();

            } else if (code == codes.COURSE_NOT_FOUND) {
                course.setCustomValidity("Dieser Kurs existiert nicht.");
                course.reportValidity();
                
            } else if (code == codes.INVALID_ADDRESS) {
                outputElement.textContent = "Die eingegebene Adresse existiert nicht."
            }

            throw new Error(code);
        } else if (data.hasOwnProperty("user_id")) {
            fetch(apiURL + "token", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `grant_type=password&username=${encodeURIComponent(body.user.email)}&password=${encodeURIComponent(body.password.password)}`
            }).then(response => {
                if (!response.ok) {
                    outputElement.textContent = "Falsche E-Mail oder falsches Passwort.";
                    hideLoading();
                    throw new Error(response);
                }
                return response.json();
            }).then(data => {
                document.cookie = "access_token=" + data.access_token + "; SameSite=Strict";
                moveToPanel();
            });

        } else {
            outputElement.textContent = "ERROR: " + JSON.stringify(data, null, 2);
        }
    })
    .catch(error => {
        console.error
        ('Can\'t register:', error);
    });
});


function showLoading() {
    loadingElement.innerHTML = loadingImage;
    loadingElement.className = "loading ld ld-fade-in"
}

function hideLoading() {
    loadingElement.innerHTML = ""
    loadingElement.className = ""
}


function moveToPanel() {
    checkElement.className = "loading ld ld-fade-in"
    checkElement.innerHTML = checkImage;
    checkElement.innerHTML += checkText;

    setTimeout(function() {
        window.location.href = "panel.html";
    }, 2000);
}