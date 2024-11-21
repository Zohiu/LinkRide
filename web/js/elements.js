let appFooter = `
<div class="footer-area">
    <footer class="container">
        <small>
            <a href="datenschutz.html">Datenschutz</a> • <a href="impressum.html">Impressum</a>
        </small>
    </footer>
</div>
`;

let appHeader = `
<nav class="container-fluid nav-bar">
    <ul>
        <a href="/"><li><img src="assets/logo-48.png" alt="Logo" class="logo"></li></a>
        <a href="/"><li class="gradient-text logo-text"><strong>LinkRide</strong></li></a>
    </ul>
    <ul>
        <li><a href="register.html">Registrieren</a></li>
        <li><a href="login.html" role="button">Anmelden</a></li>
    </ul>
</nav>
`;

let panelHeader = `
<nav class="container-fluid nav-bar">
    <ul>
        <a href="/"><li><img src="assets/logo-48.png" alt="Logo" class="logo"></li></a>
        <a href="/"><li class="gradient-text logo-text"><strong>LinkRide</strong></li></a>
    </ul>
    <ul>
        <li><a id="singout" href="javascript:logout();">Abmelden</a></li>
    </ul>
</nav>
`;

let header = document.getElementById("lr-header");
let pHeader = document.getElementById("lr-panel-header");
let footer = document.getElementById("lr-footer");

if (header) header.innerHTML = appHeader;
if (pHeader) pHeader.innerHTML = panelHeader;
if (footer) footer.innerHTML = appFooter;