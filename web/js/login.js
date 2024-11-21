var apiURL = "https://linkride.stuehrwoldt.de/api/";

let registerForm = document.getElementById("login");
let outputElement = document.getElementById("output");

let email = document.getElementById("email");
email.addEventListener('input', () => { email.setCustomValidity(''); });
let password = document.getElementById("password");


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


fetch(apiURL + "authtest", {
    method: 'GET',
    credentials: 'include',
    headers: {
        Authorization: "Bearer " + getCookie("access_token")
    }
})
.then(response => {
    if (response.ok) {
        window.location.href = "panel.html";
    }
})


registerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    showLoading()

    fetch(apiURL + "token", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `grant_type=password&username=${encodeURIComponent(email.value)}&password=${encodeURIComponent(password.value)}`
    }).then(response => {
        if (!response.ok) {
            outputElement.textContent = "Falsche E-Mail oder falsches Passwort.";
            hideLoading();
            throw new Error(response);
        }
        return response.json();
    }).then(data => {
        document.cookie = "access_token=" + data.access_token + "; SameSite=Strict";
        hideLoading();
        moveToPanel();
    }).catch(error => {
        console.error
        ('Error: ', error);
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