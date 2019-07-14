document.documentElement.setAttribute("data-agent", navigator.userAgent)

let skycons;
let alertCard = document.getElementById("alerts-card");
let millerLogo = document.getElementById("miller-logo");
if(alertCard) {
  skycons = new Skycons({"color": "red"});
} else {
  skycons = new Skycons({"color": "#02cc5f"});
}

//Handle skycons

function setSkycon(icon) {
  skycons.add("skycon", icon);
  skycons.play();
}



//check if alerts are showing
if(alertCard) {
  alertCard.style.width = millerLogo.offsetWidth;
  window.addEventListener('resize', function() {//on resize, change alert's size
    alertCard.style.width = millerLogo.offsetWidth;
  });
  
  
  
}