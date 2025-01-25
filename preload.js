function updateUIBasedOnWindowSize() {
  const gameControls = document.getElementById("game-controls");
  const enemyRules = document.getElementById("enemy-rules");

  // Check the current window dimensions
  if (window.innerWidth < 950 || window.innerHeight < 700) {
    gameControls.style.display = "none";
    enemyRules.style.display = "none";
  } else {
    gameControls.style.display = "block";
    enemyRules.style.display = "block";
  }
}

// Add a listener for window resize
window.addEventListener("resize", updateUIBasedOnWindowSize);

// Run the function initially to set the correct state
updateUIBasedOnWindowSize();
