var apiURL = "https://linkride.stuehrwoldt.de/api/";

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
    INVALID_COST: 12,
    INVALID_CONTACT: 13
}

let loadingElement = document.getElementById("loading")
let loadingImage = `<img src="assets/loading.svg" class="ld ld-fade-in" />`

let checkElement = document.getElementById("check")
let checkImage = `<img src="assets/check.svg" class="ld ld-fall-ttb-in" />`
let failImage = `<img src="assets/cross.svg" class="ld ld-fall-ttb-in" />`

function showLoading() {
    loadingElement.innerHTML = loadingImage;
    loadingElement.className = "loading ld ld-fade-in"
}

function hideLoading() {
    loadingElement.innerHTML = ""
    loadingElement.className = ""
}


function showSuccess(text) {
    checkElement.className = "loading ld ld-fade-in"
    checkElement.innerHTML = checkImage;

    let checkText = `<br><h1 class="gradient-text ld ld-fade-in">` + text + `</h1>`

    checkElement.innerHTML += checkText;

    setTimeout(function () {
        checkElement.className = "";
        checkElement.innerHTML = "";
    }, 1500);
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}


function login() {
    window.location.replace("/login.html");
}


// Logout
function logout() {
    document.cookie.split(";").forEach(function(c) { document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); });
    checkElement.className = "loading ld ld-fade-in"
    checkElement.innerHTML = failImage;

    let checkText = `<br><h1 class="ld ld-fade-in" style="color: #e15b64;">Du wirst abgemeldet..</h1>`

    checkElement.innerHTML += checkText;

    setTimeout(function () {
        checkElement.className = "";
        checkElement.innerHTML = "";
        window.location.replace("/");
    }, 1500);
}


function test_auth() {
    fetch(apiURL + "authtest", {
        method: 'GET',
        credentials: 'include',
        headers: {
            Authorization: "Bearer " + getCookie("access_token")
        }
    })
    .then(response => {
        if (!response.ok) {
            login()
        }
    })
}

// Rides

let date_selector = document.getElementById("datePicker");
let date_text = document.getElementById("date-text");

let date_last = document.getElementById("date-last");
let date_next = document.getElementById("date-next");

let anfahrt_time = document.getElementById("anfahrt-time");
let rueckfahrt_time = document.getElementById("rueckfahrt-time");

let anfahrt_element = document.getElementById("anfahrt");
let rueckfahrt_element = document.getElementById("rueckfahrt");


let date = new Date();
set_date(date)

// click events
date_text.addEventListener('click', function(event) {
    event.preventDefault();
    date_selector.showPicker();
});

date_last.addEventListener('click', function(event) {
    event.preventDefault();
    date.setDate(date.getDate() - 1);
    set_date(date)
});

date_next.addEventListener('click', function(event) {
    event.preventDefault();
    date.setDate(date.getDate() + 1);
    set_date(date)
});


date_selector.addEventListener('change', function() {
    date = new Date(this.value);
    set_date(date);
});


function set_date(date) {
    let day = (date.getDate()).toString().padStart(2, '0');
    let month = (date.getMonth() + 1).toString().padStart(2, '0');

    date_text.innerHTML = day + "." + month + "." + date.getFullYear();
    get_rides_on_day(date)
}


function get_rides_on_day(date) {
    fetch(apiURL + "user/times?date=" + date.toISOString().split("T")[0], {
        method: 'GET',
        credentials: 'include',
        headers: {
            Authorization: "Bearer " + getCookie("access_token")
        }
    })
    .then(response => {
        if (!response.ok) {
            test_auth();
        }
        return response.json();
    })
    .then(json => {
        if (json.start) anfahrt_time.innerHTML = "Für " +  json.start + " Uhr";
        else anfahrt_time.innerHTML = "Kein Unterricht";

        if (json.end) rueckfahrt_time.innerHTML = "Für " +  json.end + " Uhr";
        else rueckfahrt_time.innerHTML = "Kein Unterricht";
    })


    fetch(apiURL + "user/trips?date=" + date.toISOString().split("T")[0], {
        method: 'GET',
        credentials: 'include',
        headers: {
            Authorization: "Bearer " + getCookie("access_token")
        }
    })
    .then(response => {
        if (!response.ok) {
            test_auth();
        }
        return response.json();
    })
    .then(json => {
        let theaders = `<tr><th>Name</th><th>Preis</th><th>Kontakt</th></tr>`;

        let start_drivers = "";
        for (driver in json.start) {
            let name = json.start[driver].name;
            let cost = json.start[driver].cost;
            let contact = json.start[driver].contact;
            let link = contact
            if (("" + link).includes("@")) link = "mailto:" + link
            else link = "tel:" + link

            start_drivers += "<tr><td>" + name + "</td><td>" + cost + "€</td>" + `<td><a href="` + link + `">` + contact + "</a></td></tr>";
        }
        anfahrt_element.innerHTML = theaders + start_drivers;


        let end_drivers = "";
        for (driver in json.end) {
            let name = json.end[driver].name;
            let cost = json.end[driver].cost;
            let contact = json.end[driver].contact;
            let link = contact
            if (("" + link).includes("@")) link = "mailto:" + link
            else link = "tel:" + link

            end_drivers += "<tr><td>" + name + "</td><td>" + cost + "€</td>" + `<td><a href="` + link + `">` + contact + "</a></td></tr>";
        }
        rueckfahrt_element.innerHTML = theaders + end_drivers;
    })
    
}


get_rides_on_day(date);


// Account settings

let account_email = document.getElementById("email");
account_email.addEventListener('input', () => { account_email.setCustomValidity(''); });
let account_fname = document.getElementById("fname");
account_fname.addEventListener('input', () => { account_fname.setCustomValidity(''); });
let account_lname = document.getElementById("lname");
account_lname.addEventListener('input', () => { account_lname.setCustomValidity(''); });
let account_course = document.getElementById("course");
account_course.addEventListener('input', () => { account_course.setCustomValidity(''); });
let account_pcode = document.getElementById("pcode");
account_pcode.addEventListener('input', () => { account_pcode.setCustomValidity(''); });
let account_town = document.getElementById("town");
account_town.addEventListener('input', () => { account_town.setCustomValidity(''); });
let account_street = document.getElementById("street");
account_street.addEventListener('input', () => { account_street.setCustomValidity(''); });
let account_output = document.getElementById("account-output");
account_output.addEventListener('input', () => { account_output.setCustomValidity(''); });


fetch(apiURL + "user", {
    method: 'GET',
    credentials: 'include',
    headers: {
        Authorization: "Bearer " + getCookie("access_token")
    }
})
.then(response => {
    if (!response.ok) {
        test_auth();
    }

    return response.json();
})
.then(json => {
    account_email.value = json.email;
    account_fname.value = json.first_name;
    account_lname.value = json.last_name;
    account_course.value = json.untis_course_name;
    account_pcode.value = json.postal_code;
    account_town.value = json.town;
    account_street.value = json.street_and_house;

    // These are needed in map.html
    user_latitude = json.latitude;
    user_longitude = json.longitude;
    map_update();

    let radius = mymap.distance(L.latLng(school_latitude, school_longitude), L.latLng(user_latitude, user_longitude))
    // https://stackoverflow.com/a/75251360  -  I precalculated it
    let zoom = Math.floor(Math.log2(72272370.2928/radius))
    mymap.setView(ellipse_position, zoom);
})


document.getElementById("account-info").addEventListener("submit", (e) => {
    e.preventDefault();
    showLoading();

    fetch(apiURL + "user", {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: "Bearer " + getCookie("access_token"),
        },
        body: JSON.stringify({
            email: email.value,
            first_name: fname.value,
            last_name: lname.value,
            untis_course_name: course.value,
            postal_code: pcode.value,
            town: town.value,
            street_and_house: street.value,
        }),
    })
    .then(response => {
        if (!response.ok) {
            test_auth();
        }

        return response.json();
    })
    .then(data => {
        hideLoading();

        if (data.hasOwnProperty("error_code")) {
            let code = data.error_code;

            if (code == codes.INVALID_EMAIL) {
                account_email.setCustomValidity("Bitte gebe eine eche E-Mail an.");
                account_email.reportValidity();

            } else if (code == codes.EMAIL_EXISTS) {
                account_email.setCustomValidity("Ein Konto mit dieser E-Mail existiert bereits.");
                account_email.reportValidity();

            } else if (code == codes.INVALID_FIRST_NAME) {
                account_fname.setCustomValidity("2-25 Zeichen benötigt");
                account_fname.reportValidity();
            
            } else if (code == codes.INVALID_LAST_NAME) {
                account_lname.setCustomValidity("2-25 Zeichen benötigt");
                account_lname.reportValidity();

            } else if (code == codes.COURSE_NOT_FOUND) {
                account_course.setCustomValidity("Dieser Kurs existiert nicht.");
                account_course.reportValidity();
                
            } else if (code == codes.INVALID_ADDRESS) {
                account_output.textContent = "Die eingegebene Adresse existiert nicht."
            }

            throw new Error(code);
        } else if (data.hasOwnProperty("user_id")) {
            showSuccess("Gespeichert!");

        } else {
            account_output.textContent = "ERROR: " + JSON.stringify(data, null, 2);
        }
    })
    .catch(error => {
        console.error
        ('Can\'t change account info:', error);
    });
});

// General settings

let old_password = document.getElementById("old_password");
old_password.addEventListener('input', () => { old_password.setCustomValidity(''); });
let new_password = document.getElementById("new_password");
new_password.addEventListener('input', () => { new_password.setCustomValidity(''); });
let del_password = document.getElementById("del_password");
del_password.addEventListener('input', () => { del_password.setCustomValidity(''); });

let del_output = document.getElementById("del-output");
let pass_output = document.getElementById("pass-output");


// change password
document.getElementById("change-password").addEventListener("submit", (e) => {
    e.preventDefault();
    showLoading();

    fetch(apiURL + "user/password", {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: "Bearer " + getCookie("access_token"),
        },
        body: JSON.stringify({
            old_password: {
                password: old_password.value
            },
            new_password: {
                password: new_password.value
            },
        }),
    })
    .then(response => {
        if (!response.ok) {
            test_auth();
        }
        return response.json();
    })
    .then(data => {
        hideLoading();

        if (data.hasOwnProperty("error_code")) {
            let code = data.error_code;

            if (code == codes.PASSWORDS_ARE_THE_SAME) {
                new_password.setCustomValidity("Bitte gebe ein neues Passwort an, nicht das gleiche.");
                new_password.reportValidity();

            } else if (code == codes.INVALID_PASSWORD) {
                new_password.setCustomValidity("Passwort muss 6-20 Zeichen mit Zahl, Sonderzeichen, Groß- und Kleinbuchstaben sein.");
                new_password.reportValidity();
            
            } else if (code == codes.PASSWORD_INCORRECT) {
                old_password.setCustomValidity("Falsches Passwort");
                old_password.reportValidity();
            }


            throw new Error(code);
        } else if (data.hasOwnProperty("user_id")) {
            showSuccess("Passwort geändert!");

        } else {
            pass_output.textContent = "ERROR: " + JSON.stringify(data, null, 2);
        }
    })
    .catch(error => {
        console.error
        ('Can\'t change account info:', error);
    });
});

document.getElementById("delete-account").addEventListener("submit", (e) => {
    e.preventDefault();
    showLoading();
    fetch(apiURL + "user", {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: "Bearer " + getCookie("access_token"),
        },
        body: JSON.stringify({
            password: del_password.value
        }),
    })
    .then(response => {
        if (!response.ok) {
            test_auth();
        }
        return response.json();
    })
    .then(data => {
        hideLoading();

        if (data.hasOwnProperty("error_code")) {
            let code = data.error_code;

            if (code == codes.PASSWORD_INCORRECT) {
                del_password.setCustomValidity("Falsches Passwort");
                del_password.reportValidity();
            }

            throw new Error(code);
        } else if (data.hasOwnProperty("user_id")) {
            showSuccess("Konto gelöscht!");
            logout();

        } else {
            del_output.textContent = "ERROR: " + JSON.stringify(data, null, 2);
        }
    })
    .catch(error => {
        console.error
        ('Can\'t change account info:', error);
    });
});

// Driver settings

let driver_section = document.getElementById("driver-settings")

let checkbox_toggle = document.getElementById("checkbox_toggle");

let cost = document.getElementById("in_cost");
cost.addEventListener('input', () => { cost.setCustomValidity(''); });
let cost_output = document.getElementById("cost-output");

let contact = document.getElementById("contact");
contact.addEventListener('input', () => { contact.setCustomValidity(''); });

let width = document.getElementById("rad1");
let length = document.getElementById("rad2");
let position = document.getElementById("pos");


fetch(apiURL + "driver", {
    method: 'GET',
    credentials: 'include',
    headers: {
        Authorization: "Bearer " + getCookie("access_token")
    }
})
.then(response => {
    if (!response.ok) {
        test_auth();
    }

    return response.json();
})
.then(json => {
    checkbox_toggle.checked = json.enabled;

    if (checkbox_toggle.checked) {
        driver_section.removeAttribute("hidden");
    } else {
        driver_section.setAttribute("hidden", "")
    }

    cost.value = json.cost;
    contact.value = json.contact;
    width.value = json.ellipse_width;
    length.value = json.ellipse_length;
    position.value = json.ellipse_position;
    map_update();
})


// toggle driver account
function toggle_submit() {
    showLoading();

    fetch(apiURL + "driver", {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: "Bearer " + getCookie("access_token"),
        },
        body: JSON.stringify({
            enabled: checkbox_toggle.checked,
        }),
    })
    .then(response => {
        if (!response.ok) {
            test_auth();
        }
        return response.json();
    })
    .then(data => {
        hideLoading();

        if (data.hasOwnProperty("error_code")) {
            throw new Error(code);
        } else if (data.hasOwnProperty("user_id")) {
            if (checkbox_toggle.checked == true) {
                showSuccess("Du bist jetzt<br>Fahrer!");
                driver_section.removeAttribute("hidden");
            }
            else {
                showSuccess("Du bist kein<br>Fahrer mehr!");
                driver_section.setAttribute("hidden", "")
            }

        } else {
            cost_output.textContent = "ERROR: " + JSON.stringify(data, null, 2);
        }
    })
    .catch(error => {
        console.error
        ('Can\'t change driver info:', error);
    });
}
document.getElementById("checkbox_toggle").addEventListener("click", toggle_submit)

// change cost per ride
document.getElementById("driver-cost").addEventListener("submit", (e) => {
    e.preventDefault();
    showLoading();

    fetch(apiURL + "driver", {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: "Bearer " + getCookie("access_token"),
        },
        body: JSON.stringify({
            cost: parseFloat(cost.value),
            contact: contact.value
        }),
    })
    .then(response => {
        if (!response.ok) {
            test_auth();
        }
        return response.json();
    })
    .then(data => {
        hideLoading();

        if (data.hasOwnProperty("error_code")) {
            let code = data.error_code;

            if (code == codes.INVALID_COST) {
                cost.setCustomValidity("Bitte gebe einen echten Wert an.");
                cost.reportValidity();
            } 

            else if (code == codes.INVALID_CONTACT) {
                contact.setCustomValidity("5-25 Zeichen");
                contact.reportValidity();
            } 

            throw new Error(code);
        } else if (data.hasOwnProperty("user_id")) {
            showSuccess("Gespeichert!");

        } else {
            cost_output.textContent = "ERROR: " + JSON.stringify(data, null, 2);
        }
    })
    .catch(error => {
        console.error
        ('Can\'t change driver info:', error);
    });
});

// change area
function map_submit() {
    showLoading();

    fetch(apiURL + "driver", {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: "Bearer " + getCookie("access_token"),
        },
        body: JSON.stringify({
            ellipse_width: parseInt(width.value),
            ellipse_length: parseInt(length.value),
            ellipse_position: parseInt(position.value),
        }),
    })
    .then(response => {
        if (!response.ok) {
            test_auth();
        }
        return response.json();
    })
    .then(data => {
        hideLoading();

        if (data.hasOwnProperty("error_code")) {
            throw new Error(code);
        } else if (data.hasOwnProperty("user_id")) {
            showSuccess("Bereich gespeichert!");

        } else {
            cost_output.textContent = "ERROR: " + JSON.stringify(data, null, 2);
        }
    })
    .catch(error => {
        console.error
        ('Can\'t change area info:', error);
    });
}
document.getElementById("map-submit").addEventListener("click", map_submit);

