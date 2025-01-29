const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 650;

let animations = []; // Store swing animations

let gameOver = false;

let player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 15,
    color: 'gold',
    direction: Math.PI * 1.5, // Set initial direction to face up (90 degrees, or Math.PI * 1.5)
    health: 4,
    isGlowing: false, // Whether the player is glowing
    glowDuration: 500, // Glow duration in milliseconds
    glowStartTime: 0, // Time when the glow started
    meleeCharges: 4, // Maximum number of melee swings
    outlineColor: 'white', // New property for outline color
    outlineWidth: 3 // New property for outline width

};

let enemyKillCount = 0; // Track the number of enemies killed
let keysPressed = {};
let enemies = [];
let bullets = [];
let spawnInterval = 650; // Enemies spawn every second. Enemy Spawn Rate. Lower Number is faster, Higher Number Is slower.
let minSpawnInterval = 80; // Minimum interval (100ms)
let lastTimeDecrease = 0; // To track when to decrease the spawn interval
let timeSinceStart = 0; // To track total time passed in the game
let lastSpawn = 0;
let explosions = []; // Store explosions
let score = 0; // Player's score
let scorePopups = []; // Store score popups
let sparks = []; // Store active sparks
let gameStarted = false; // Flag to check if the game has started

let isMusicMuted = false; // Flag to track mute status
let musicAudio = null; // Store the audio object for global use





// Handle any key press to start the game
document.addEventListener('keydown', (e) => {
  if (!gameStarted) {
    gameStarted = true;
    // Hide the start screen
    document.getElementById('start-screen').style.display = 'none';
    // Start the game logic
    startGame();
    playMusic(); // Start the music. Overwhelm.mp3. Look here!!
  }
});

function drawStartScreen() {
  if (!gameStarted) {
    const startScreen = document.getElementById('start-screen');

    ctx.font = '30px "Press Start 2P"';
    ctx.fillStyle = 'white';  // You can change the color if needed

    // Set the text alignment and baseline to center the text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw the "Press Any Button" text at the center of the canvas
    ctx.fillText('', canvas.width / 2, canvas.height / 2);
  }
}





// Key events for attack
const fireKeys = ['z', 'q', 'w', 'e', 'a', 's', 'd', 'x', 'c'];

document.addEventListener('keydown', (e) => {
    keysPressed[e.key] = true;

    if (fireKeys.includes(e.key)) {
        fireBullet();
    }

    // Restart the game when Enter is pressed and game is over
    if (e.key === 'Enter' && gameOver) {
        restartGame();
    }
});

document.addEventListener('keyup', (e) => {
    keysPressed[e.key] = false;
});

let lastFireTime = 0; // To track time of last shot
const fireCooldown = 200; // Time in milliseconds between each shot (200ms for faster firing)

// Bullet speed set to 10
const bulletSpeed = 12;

function playBulletSound() {
    const audio = new Audio('bullet-sound.mp3'); // Path to your MP3 file

    // Apply a 30% pitch variance to the playback rate (between 0.7 and 1.3)
    const pitchVariance = 0.3 * (Math.random() * 2 - 1); // Random pitch shift between -0.15 and +0.15
    audio.playbackRate = 1 + pitchVariance; // Adjust playback rate with pitch variance

    // Play the sound
    audio.play();
}

// Start the game logic
function startGame() {
  // Initialize your game state (reset health, score, etc.)
  player.health = 4;
  player.x = canvas.width / 2;
  player.y = canvas.height / 2;
  player.direction = Math.PI * 1.5, // Set initial direction to face up (90 degrees, or Math.PI * 1.5)
  score = 0;
  enemies = [];
  bullets = [];
  explosions = [];
  scorePopups = [];
  sparks = [];

  // Start the game loop
  requestAnimationFrame(gameLoop);
}

function drawMeleeBar() {
    const squareSize = 20; // Size of each melee charge square
    const spacing = 5; // Space between squares
    const totalCharges = 4; // Maximum melee charges
    const startX = 160; // Position to the right (adjust this value)
    const startY = canvas.height - squareSize - 20; // Slightly above the bottom edge


    for (let i = 0; i < totalCharges; i++) {
        // Draw the white outline for each health square
        ctx.fillStyle = 'white'; // White color for the outline
        ctx.fillRect(startX + i * (squareSize + spacing) - 2, startY - 2, squareSize + 4, squareSize + 4); // Slightly larger square for outline
        ctx.fillStyle = (player.meleeCharges > i) ? '#4caf50' : '#555'; // Green if charged, gray otherwise
        ctx.fillRect(startX + i * (squareSize + spacing), startY, squareSize, squareSize);
    }

}

function playDamageSound() {
    const audio = new Audio('damage-sound.mp3');
    audio.volume = 1;

    audio.play()
        .then(() => console.log("Damage sound played successfully"))
        .catch((error) => console.error("Error playing damage sound:", error));
}


function performMeleeSwing() {
    if (player.meleeCharges <= 0) {
        console.log("No melee charges left!");
        return; // No charges available
    }

    // Decrease melee charges
    player.meleeCharges--;

    // Play melee sound immediately on use
    playMeleeSlash();

    // Trigger the swing animation
    animations.push({
        type: 'swing',
        x: player.x,
        y: player.y,
        radius: 0, // Start radius
        maxRadius: 180, // Max radius of the swing
        color: 'gold',
        fadeRate: 0.4 // Smooth fade-out
    });



    // Destroy enemies in the swing radius
    const meleeRadius = 210; // Adjust as needed
    enemies = enemies.filter((enemy) => {
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= meleeRadius) {
            // Add explosion effect for the destroyed enemy
            explosions.push({
                x: enemy.x,
                y: enemy.y,
                size: 0,
                maxSize: 80,
                alpha: 1,
                color: '#ff5722', // Orange explosion for melee
                fadeRate: 0.02
            });

            return false; // Remove enemy
        }

        return true; // Keep enemies outside the swing radius
    });

    console.log(`Melee swing performed! Remaining charges: ${player.meleeCharges}`);
}

function drawBackground() {
    // Create radial gradient
    const gradient = ctx.createRadialGradient(
        canvas.width / 2, // X of center
        canvas.height / 2, // Y of center
        0, // Inner radius
        canvas.width / 2, // X of center
        canvas.height / 2, // Y of center
        canvas.width // Outer radius
    );

    // Define the gradient colors
    gradient.addColorStop(0, '#5f6266'); // Dark grey center
    gradient.addColorStop(1, '#242438'); // Even darker grey at the edges

    // Apply the gradient as a fill style and draw the background
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}


function drawSwingAnimations() {
    animations = animations.filter((animation) => {
        if (animation.type === 'swing') {
            ctx.beginPath();
            ctx.arc(animation.x, animation.y, animation.radius, 0, Math.PI * 2);
            ctx.strokeStyle = animation.color;
            ctx.lineWidth = 5;
            ctx.globalAlpha = Math.max(0, 1 - animation.radius / animation.maxRadius); // Fade out
            ctx.stroke();
            ctx.closePath();

            // Increase the radius
            animation.radius += 5;

            // Remove the animation if it exceeds max radius
            return animation.radius <= animation.maxRadius;
        }
        return true;
    });

    // Reset alpha to 1 for other drawings
    ctx.globalAlpha = 1;
}

document.addEventListener('keydown', (e) => {
    keysPressed[e.key] = true;

     if (e.key === ' ' || e.key === '1' || e.key === '2' || e.key === '3') {
        performMeleeSwing(); // Trigger melee swing
    }

    // Restart the game with Enter
    if (e.key === 'Enter' && gameOver) {
        restartGame();
    }
});

// Plays an explosion sound when enemies are killed
function playExplosionSound() {
    const audio = new Audio('explosion.mp3'); // Replace with your explosion sound file path
    const baseRate = 1.0; // Normal playback speed
    const pitchVariance = 0.3; // 30% up and down pitch variance
    const randomPitch = baseRate + (Math.random() * pitchVariance * 2 - pitchVariance);
    audio.playbackRate = randomPitch; // Set the playback speed with pitch variance
    audio.volume = 0.8; // Adjust the volume (optional)
    audio.play();
}

// Melee explosion sound
function playMeleeSlash() {
    const audio = new Audio('katanaslice.mp3'); // Replace with your explosion sound file path
    const baseRate = 1.0; // Normal playback speed
    const pitchVariance = 0.3; // 30% up and down pitch variance
    const randomPitch = baseRate + (Math.random() * pitchVariance * 2 - pitchVariance);
    audio.playbackRate = randomPitch; // Set the playback speed with pitch variance
    audio.volume = 0.8; // Adjust the volume (optional)
    audio.play();
}

// Create a global audio object for the music
let backgroundMusic;

// Function to load music
function loadMusic(filePath) {
    // Create a new Audio object and set its source
    backgroundMusic = new Audio(filePath);
    backgroundMusic.loop = true; // Enable looping
    backgroundMusic.volume = 0.5; // Set default volume (adjust as needed)

    // Log to confirm the music is ready to play
    backgroundMusic.oncanplaythrough = () => {
        console.log("Music loaded and ready to play!");
    };

    // Log errors if any occur
    backgroundMusic.onerror = () => {
        console.error("Error loading music:", backgroundMusic.error);
    };
}

// Function to play the music
function playMusic() {
    if (backgroundMusic) {
        backgroundMusic.play()
            .then(() => console.log("Music playback started!"))
            .catch((error) => console.error("Error playing music:", error));
    } else {
        console.error("Music not loaded yet!");
    }
}



// Function to stop the music
function stopMusic() {
    if (backgroundMusic) {
        backgroundMusic.pause(); // Pause the music
        backgroundMusic.currentTime = 0; // Reset to the beginning
        console.log("Music playback stopped.");
    }
}

// Example: Load the music on page load
window.onload = () => {
    loadMusic("OverWhelm.mp3"); // Replace with the correct file path
};





// Update your checkCollisions function
function checkCollisions() {
    // Check collisions between bullets and enemies
    bullets.forEach((bullet, bIndex) => {
        enemies.forEach((enemy, eIndex) => {
            const dx = bullet.x - enemy.x;
            const dy = bullet.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < bullet.radius + enemy.radius) {
                // Add score popup at the enemy's position
                scorePopups.push({
                    x: enemy.x,
                    y: enemy.y,
                    score: enemy.points,
                    alpha: 1
                });

                // Increase the score
                score += enemy.points;

                // Reduce enemy health by 1
                enemy.health -= 1;

                if (enemy.health <= 0) {
                    // Play explosion sound
                    playExplosionSound();

                    // Create explosion with the bullet's color
                    explosions.push({
                        x: enemy.x,
                        y: enemy.y,
                        size: 0,
                        maxSize: 80,
                        alpha: 1,
                        color: bullet.color,
                        fadeRate: 0.02
                    });

                    // Increment kill counter
                    enemyKillCount++;

                    // Remove the enemy and bullet
                    enemies.splice(eIndex, 1);
                    bullets.splice(bIndex, 1);
                } else {
                    // Remove the bullet if it doesn't destroy the enemy
                    bullets.splice(bIndex, 1);
                }
            }
        });
    });

    // Check for collisions between the player and enemies
    enemies.forEach((enemy, eIndex) => {
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < player.radius + enemy.radius) {
            // Reduce player health on collision with enemy
            player.health -= 1;

            // Delete the enemy after collision
            enemies.splice(eIndex, 1);

            // Optional: Log the player's health to debug
            console.log(`Player collided with enemy! Health: ${player.health}`);

            // Play explosion sound
            playDamageSound();

            // Check if player health is 0
            if (player.health <= 0) {
                gameOver = true;  // Set game over flag to true
            }
        }
    });
}


function fireBulletsInEightDirections() {
    // Fixed 8 directions for bullet fire
    const directions = [
        Math.PI / 2, // Top
        Math.PI * 1.5, // Bottom
        0, // Right
        Math.PI, // Left
        Math.PI / 4, // Top-right diagonal
        Math.PI * 3 / 4, // Top-left diagonal
        Math.PI * 5 / 4, // Bottom-left diagonal
        Math.PI * 7 / 4, // Bottom-right diagonal
    ];

    // Apply small angle correction to the diagonals to fix misalignment
    const diagonalCorrection = -0.10;  // Small corrective angle adjustment

    // Adjust diagonals slightly to fix misalignment
    directions[4] += diagonalCorrection; // Top-right diagonal
    directions[5] -= diagonalCorrection; // Top-left diagonal
    directions[6] += diagonalCorrection; // Bottom-left diagonal
    directions[7] -= diagonalCorrection; // Bottom-right diagonal

    // Visualize the directions by drawing lines (for debugging purposes)
    directions.forEach((bulletAngle) => {
        ctx.beginPath();
        ctx.moveTo(player.x, player.y); // Start at the player's position
        ctx.lineTo(
            player.x + Math.cos(bulletAngle) * 100, // Extend the line in the bullet direction
            player.y + Math.sin(bulletAngle) * 100
        );
        ctx.strokeStyle = 'yellow'; // Color the debug lines in yellow
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();
    });

    // Fire bullets in each of these 8 directions
    directions.forEach((bulletAngle) => {
        bullets.push({
            x: player.x + Math.cos(bulletAngle) * player.radius, // Start at the tip of the "gun"
            y: player.y + Math.sin(bulletAngle) * player.radius,
            dx: Math.cos(bulletAngle) * bulletSpeed,
            dy: Math.sin(bulletAngle) * bulletSpeed,
            radius: 13,
            color: 'rainbow', // Bullet color
        });

        // Emit sparks in the direction of the bullet
        emitSparks(player.x, player.y, bulletAngle, 'white');
    });

    // Play bullet firing sound
    playBulletSound();
}





function emitSparks(x, y, direction, color) {
    const sparkCount = 10; // Number of sparks per shot
    for (let i = 0; i < sparkCount; i++) {
        const angleVariation = (Math.random() - 0.5) * 0.4; // Small spread for sparks
        const speed = Math.random() * 2 + 1; // Random speed for each spark
        sparks.push({
            x: x + Math.cos(direction) * player.radius, // Start at the front of the gun
            y: y + Math.sin(direction) * player.radius,
            dx: Math.cos(direction + angleVariation) * speed, // Direction with variation
            dy: Math.sin(direction + angleVariation) * speed,
            radius: Math.random() * 5 + 1, // Random small size
            color: color, // Match bullet color
            life: Math.random() * 20 + 10, // Lifetime of the spark
        });
    }
}


function drawSparks() {
    sparks.forEach((spark) => {
        ctx.beginPath();
        ctx.arc(spark.x, spark.y, spark.radius, 0, Math.PI * 2);
        ctx.fillStyle = spark.color;
        ctx.fill();
        ctx.closePath();
    });
}

function updateSparks() {
    sparks = sparks.filter((spark) => {
        spark.x += spark.dx; // Move spark
        spark.y += spark.dy;
        spark.life -= 1; // Reduce spark life
        return spark.life > 0; // Remove spark when life is zero
    });
}

function fireBullet(timestamp) {
    // Only fire if enough time has passed (based on cooldown)
    if (timestamp - lastFireTime < fireCooldown) return;

    // Get a random color from the rainbowColors array
    const color = rainbowColors[Math.floor(Math.random() * rainbowColors.length)];

    // Fire a single bullet in the direction the player is facing
    bullets.push({
    x: player.x + Math.cos(player.direction) * player.radius, // Start at the tip of the "gun"
    y: player.y + Math.sin(player.direction) * player.radius,
    dx: Math.cos(player.direction) * bulletSpeed,
    dy: Math.sin(player.direction) * bulletSpeed,
    radius: 13,
    color: color,
});


    // Emit sparks in the direction of the bullet
    emitSparks(player.x, player.y, player.direction, color);

    lastFireTime = timestamp; // Update the time of last shot

    // Play the bullet firing sound with pitch variance
    playBulletSound();
}


// Game Loop and Other Functions continue as normal...


const rainbowColors = [
    'red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet'
];

function spawnEnemy() {
    const spawnPoints = [
        { x: canvas.width / 2, y: -10 }, // Top center
        { x: canvas.width / 2, y: canvas.height + 10 }, // Bottom center
        { x: -10, y: canvas.height / 2 }, // Left center
        { x: canvas.width + 10, y: canvas.height / 2 }, // Right center
        { x: -10, y: -10 }, // Top-left
        { x: canvas.width + 10, y: -10 }, // Top-right
        { x: -10, y: canvas.height + 10 }, // Bottom-left
        { x: canvas.width + 10, y: canvas.height + 10 }, // Bottom-right
    ];

    const spawnPoint = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
    const angle = Math.atan2(player.y - spawnPoint.y, player.x - spawnPoint.x);

    // Check for RainbowEnemy first (5% chance)
    if (Math.random() < 0.009) { // 2% chance for RainbowEnemy
        enemies.push({
            x: spawnPoint.x,
            y: spawnPoint.y,
            dx: Math.cos(angle),
            dy: Math.sin(angle),
            radius: 40, // Larger size for RainbowEnemy
            color: '#62a894', // Fixed color for RainbowEnemy
            speed: 0.2, // Slow speed
            health: 4, // High health
            points: 1, // Score value for RainbowEnemy
            isRainbow: true // Flag to identify RainbowEnemy
        });
        return; // Return early to avoid spawning a regular enemy
    }

    // Randomly decide if the enemy is small, medium, large, or red small
    const isRedSmallEnemy = Math.random() < 0.05; // 5% chance of a red small enemy
    const isLargeEnemy = !isRedSmallEnemy && Math.random() < 0.1; // 10% chance of a large enemy
    const isMediumEnemy = !isRedSmallEnemy && !isLargeEnemy && Math.random() < 0.2; // 20% chance of a medium enemy

    enemies.push({
        x: spawnPoint.x,
        y: spawnPoint.y,
        dx: Math.cos(angle),
        dy: Math.sin(angle),
        radius: isRedSmallEnemy ? 10 : isLargeEnemy ? 25 : isMediumEnemy ? 20 : 15, // Radii for enemy types
        color: isRedSmallEnemy ? 'red' : isLargeEnemy ? '#91408a' : isMediumEnemy ? '#a89374' : 'white', // Colors for enemy types
        speed: isRedSmallEnemy ? 4 : isLargeEnemy ? 1 : isMediumEnemy ? 2 : 3, // Speed for enemy types
        health: isRedSmallEnemy ? 1 : isLargeEnemy ? 3 : isMediumEnemy ? 2 : 1, // Health for enemy types
        points: isRedSmallEnemy ? 2 : isLargeEnemy ? 3 : isMediumEnemy ? 2 : 1, // Points for enemy types
        isRedSmall: isRedSmallEnemy // Flag for red small enemies
    });
}


function updatePlayerDirection() {
    const aspectRatio = canvas.width / canvas.height; // Aspect ratio of the canvas

    if (keysPressed['ArrowUp'] && keysPressed['ArrowRight']) {
        player.direction = Math.atan2(-1, aspectRatio); // Top-right
    } else if (keysPressed['ArrowUp'] && keysPressed['ArrowLeft']) {
        player.direction = Math.atan2(-1, -aspectRatio); // Top-left
    } else if (keysPressed['ArrowDown'] && keysPressed['ArrowRight']) {
        player.direction = Math.atan2(1, aspectRatio); // Bottom-right
    } else if (keysPressed['ArrowDown'] && keysPressed['ArrowLeft']) {
        player.direction = Math.atan2(1, -aspectRatio); // Bottom-left
    } else if (keysPressed['ArrowUp']) {
        player.direction = Math.atan2(-1, 0); // Up
    } else if (keysPressed['ArrowDown']) {
        player.direction = Math.atan2(1, 0); // Down
    } else if (keysPressed['ArrowLeft']) {
        player.direction = Math.atan2(0, -1); // Left
    } else if (keysPressed['ArrowRight']) {
        player.direction = Math.atan2(0, 1); // Right
    }
}


function normalizeDirection() {
    const aspectRatio = canvas.width / canvas.height;

    // Normalize diagonal movement for non-square canvases
    if (keysPressed['ArrowUp'] && keysPressed['ArrowRight']) {
        player.direction = Math.atan2(-1, aspectRatio); // Top-right
    } else if (keysPressed['ArrowUp'] && keysPressed['ArrowLeft']) {
        player.direction = Math.atan2(-1, -aspectRatio); // Top-left
    } else if (keysPressed['ArrowDown'] && keysPressed['ArrowRight']) {
        player.direction = Math.atan2(1, aspectRatio); // Bottom-right
    } else if (keysPressed['ArrowDown'] && keysPressed['ArrowLeft']) {
        player.direction = Math.atan2(1, -aspectRatio); // Bottom-left
    }
}


function updateBullets() {
    bullets = bullets.filter((bullet) => {
        bullet.x += bullet.dx;
        bullet.y += bullet.dy;

        return bullet.x >= 0 && bullet.x <= canvas.width &&
               bullet.y >= 0 && bullet.y <= canvas.height;
    });
}

function updateEnemies() {
    enemies.forEach((enemy) => {
        enemy.x += enemy.dx * enemy.speed;
        enemy.y += enemy.dy * enemy.speed;
    });

    enemies = enemies.filter((enemy) => {
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        return distance > player.radius;
    });
}

function updateScorePopups() {
    scorePopups.forEach((popup, index) => {
        popup.alpha -= 0.05; // Fade the score popup out over time
        popup.y -= 2; // Move the popup upwards

        if (popup.alpha <= 0) {
            scorePopups.splice(index, 1); // Remove popup after it fades
        }
    });
}

function checkCollisions() {
    bullets.forEach((bullet, bIndex) => {
        enemies.forEach((enemy, eIndex) => {
            const dx = bullet.x - enemy.x;
            const dy = bullet.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < bullet.radius + enemy.radius) {
                // Add score popup at the enemy's position
                scorePopups.push({
                    x: enemy.x,
                    y: enemy.y,
                    score: enemy.points,
                    alpha: 1
                });

                // Increase the score
                score += enemy.points;

                // Reduce enemy health by 1
                enemy.health -= 1;

                if (enemy.health <= 0) {
    // Play explosion sound
    playExplosionSound();

    // Create explosion with the bullet's color
    explosions.push({
        x: enemy.x,
        y: enemy.y,
        size: 0,
        maxSize: 80,
        alpha: 1,
        color: bullet.color,
        fadeRate: 0.02
    });

    // Check if it's a red small enemy
                       if (enemy.isRedSmall && player.health < 4) {
                           player.health++; // Grant 1 health point
                           console.log('Health restored by defeating red enemy!');
                       }

    // Increment kill counter
    enemyKillCount++;

    // Check if 20 kills are reached
    if (enemyKillCount >= 20) {
        enemyKillCount = 0; // Reset the counter

        // Fire bullets in eight directions, regardless of melee charges
        fireBulletsInEightDirections();

        // Restore melee charges only if not full
        if (player.meleeCharges < 4) {
            player.meleeCharges++;
            console.log("Melee charge restored!");
        }
    }


                    // Remove the enemy and bullet
                    enemies.splice(eIndex, 1);
                    bullets.splice(bIndex, 1);
                } else {
                    // Remove the bullet if it doesn't destroy the enemy
                    bullets.splice(bIndex, 1);
                }
            }
        });
    });

    // Check for collisions between the player and enemies
    enemies.forEach((enemy, eIndex) => {
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < player.radius + enemy.radius) {
            // Reduce player health on collision with enemy
            player.health -= 1;

            // Delete the enemy after collision
            enemies.splice(eIndex, 1);

            // Optional: Log the player's health to debug
            console.log(`Player collided with enemy! Health: ${player.health}`);


            // Play explosion sound
            playDamageSound();
//For Retaliation to stop the player from dying
            performMeleeSwing();


            // Restore melee charges only if not full
            if (player.meleeCharges < 4) {
                player.meleeCharges++;
                console.log("Melee charge restored!");
              }



            // Check if player health is 0
            if (player.health <= 0) {
                gameOver = true;  // Set game over flag to true
            }
        }
    });
}

// Draw Enemy Kill Count
function drawEnemyKillCount() {
    // Set the position above the melee charge box
    const startX = 209; // Align it with the melee charge bar
    const startY = canvas.height - 70; // Position it above the melee charge bar

    // Set the style and font to match the score
    ctx.font = '16px "Press Start 2P"';
    ctx.fillStyle = '#ffcb3b'; // Same color as score text

    // Draw the "Enemies Killed" label
    ctx.fillText('x', startX, startY - 30);  // Text label above the counter

    // Draw the actual enemy kill count
    ctx.textAlign = 'center'; // Center align the kill count number
    ctx.fillText(enemyKillCount, startX, startY);  // The kill count itself
}

function drawGameOver() {
    ctx.fillStyle = 'red';  // Red color for "Game OVER!" text
    ctx.font = '30px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText('CANNOT ESCAPE OVERWHELM.', canvas.width / 2, canvas.height / 2 - 30);

    ctx.font = '20px "Press Start 2P"';
    ctx.fillText('PRESS ENTER TO RESTART', canvas.width / 2, canvas.height / 2 + 30);

}

const muteButton = {
    x: canvas.width - 270, // Bottom-right corner adjustment
    y: canvas.height - 50,
    width: 90,
    height: 30,
    isMuted: false, // Tracks mute state
};

function drawMuteButton() {
    // Button background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(muteButton.x, muteButton.y, muteButton.width, muteButton.height);

    // Button border
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 4;
    ctx.strokeRect(muteButton.x, muteButton.y, muteButton.width, muteButton.height);

    // Button text
    ctx.font = '12px "Press Start 2P"';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const buttonText = muteButton.isMuted ? 'Unmute' : 'Mute';
    ctx.fillText(buttonText, muteButton.x + muteButton.width / 2, muteButton.y + muteButton.height / 2);
}


function handleMuteButtonClick(mouseX, mouseY) {
    // Check if the click is within the mute button's boundaries
    if (
        mouseX >= muteButton.x &&
        mouseX <= muteButton.x + muteButton.width &&
        mouseY >= muteButton.y &&
        mouseY <= muteButton.y + muteButton.height
    ) {
        muteButton.isMuted = !muteButton.isMuted; // Toggle the mute state

        if (muteButton.isMuted) {
            stopMusic(); // Stop the music when muted
            console.log("Music muted");
        } else {
            playMusic(); // Resume the music when unmuted
            console.log("Music unmuted");
        }


    }
}


// Update the existing canvas click listener to include the mute button:
canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    handleMuteButtonClick(mouseX, mouseY); // Handle mute button clicks
});



function drawPlayer() {
    // Smooth player rotation
    const targetDirection = player.direction;
    const rotationSpeed = 0.1; // Adjust this value to control rotation speed

    // Calculate the difference between current and target direction
    let angleDiff = targetDirection - player.direction;

    // Normalize the angle difference to be between -PI and PI
    angleDiff = (angleDiff + Math.PI) % (Math.PI * 2) - Math.PI;

    // Smoothly rotate towards the target direction
    player.direction += Math.min(Math.max(angleDiff, -rotationSpeed), rotationSpeed);

    // Draw the white outline
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + player.outlineWidth, 0, Math.PI * 2);
    ctx.strokeStyle = player.outlineColor;
    ctx.lineWidth = player.outlineWidth;
    ctx.stroke();
    ctx.closePath();

    // If glowing, apply a radial gradient for the glow
    if (player.isGlowing) {
        const gradient = ctx.createRadialGradient(
            player.x, player.y, player.radius, // Inner circle
            player.x, player.y, player.radius + 10 // Outer glow
        );
        gradient.addColorStop(0, 'rgba(255, 223, 0, 1)'); // Bright yellow at the center
        gradient.addColorStop(1, 'rgba(255, 223, 0, 0)'); // Fades to transparent

        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius + 15, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.closePath();
    }

    // Save the current canvas state and rotate it to align with the player's direction
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.direction);

    // Draw the player circle
    ctx.beginPath();
    ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = player.color;
    ctx.fill();
    ctx.closePath();

    // Draw the black zigzag line through the center
    ctx.beginPath();
    const zigZagHeight = player.radius * 0.3; // Zigzag height
    const zigZagSteps = 6; // Number of zigzag points
    const stepLength = (player.radius * 2) / zigZagSteps;

    // Create the zigzag line across the circle's diameter
    for (let i = 0; i <= zigZagSteps; i++) {
        const isUp = i % 2 === 0; // Alternate up and down
        const x = -player.radius + i * stepLength; // Horizontal position
        const y = isUp ? -zigZagHeight : zigZagHeight; // Vertical position
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.lineWidth = 3; // Thickness of the zigzag line
    ctx.strokeStyle = 'black';
    ctx.stroke();
    ctx.closePath();

    ctx.restore(); // Restore the canvas to its original state

    // Draw the direction line (gold line)
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(
        player.x + Math.cos(player.direction) * 1000,
        player.y + Math.sin(player.direction) * 1000
    );
    ctx.strokeStyle = 'gold';
    ctx.lineWidth = 5; // Gold line thickness
    ctx.stroke();
    ctx.closePath();

    // Draw the direction arrow
    ctx.beginPath();
    const arrowLength = 80; // Length of the arrow (larger size)
    const arrowWidth = 15; // Width of the arrow's base
    const arrowTipX = player.x + Math.cos(player.direction) * arrowLength;
    const arrowTipY = player.y + Math.sin(player.direction) * arrowLength;

    // Calculate the left and right base points of the arrow
    const leftBaseX = player.x + Math.cos(player.direction + Math.PI / 2) * arrowWidth / 2;
    const leftBaseY = player.y + Math.sin(player.direction + Math.PI / 2) * arrowWidth / 2;
    const rightBaseX = player.x + Math.cos(player.direction - Math.PI / 2) * arrowWidth / 2;
    const rightBaseY = player.y + Math.sin(player.direction - Math.PI / 2) * arrowWidth / 2;

    ctx.moveTo(leftBaseX, leftBaseY); // Start at the left base
    ctx.lineTo(arrowTipX, arrowTipY); // Line to the arrow tip
    ctx.lineTo(rightBaseX, rightBaseY); // Line to the right base
    ctx.closePath(); // Close the path to form a triangle
    ctx.fillStyle = 'white'; // Arrow color
    ctx.fill(); // Fill the arrow with color

    // Draw the outline for the arrow
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.stroke();
}






// Draw health bar
function drawHealthBar() {
    const squareSize = 20;  // Size of each health square
    const spacing = 5; // Space between squares
    const totalCharges = 4; // Total number of health squares
    const startX = canvas.width - (squareSize * 3 + spacing * 2) - 200; // Position to the left (adjust this value)
    const startY = 10; // Position from the top edge of the canvas

    for (let i = 0; i < totalCharges; i++) {
        // Draw the white outline for each health square
        ctx.fillStyle = 'white'; // White color for the outline
        ctx.fillRect(startX + i * (squareSize + spacing) - 2, startY - 2, squareSize + 4, squareSize + 4); // Slightly larger square for outline

        // Draw the red square for health
        ctx.fillStyle = (player.health > i) ? 'red' : '#555';  // Red if player has health, gray otherwise
        ctx.fillRect(startX + i * (squareSize + spacing), startY, squareSize, squareSize); // Draw each square
    }
}

// Draw score
function drawScore() {
    ctx.font = '16px "Press Start 2P"';
    ctx.fillStyle = '#ffcb3b'; // Updated to the new color
    ctx.fillText(`Score: ${score}`, 200, 30); // Draw score in the top left corner
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle'; // Align vertically in the center

}

function drawBullets() {
    bullets.forEach((bullet) => {
        // Draw the gold outline
        const outlineSize = 4; // Thickness of the gold outline
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius + outlineSize, 0, Math.PI * 2);
        ctx.strokeStyle = player.color; // Match the outline color to the player's color
        ctx.lineWidth = 2; // Thickness of the stroke
        ctx.stroke();
        ctx.closePath();

        // Draw the bullet itself
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
        ctx.fillStyle = bullet.color; // Bullet's color
        ctx.fill();
        ctx.closePath();
    });
}


function drawEnemies() {
    enemies.forEach((enemy) => {
        // Draw the shadow
        const shadowOffset = 5; // Distance of shadow below the enemy
        ctx.beginPath();
        ctx.ellipse(
            enemy.x,
            enemy.y + shadowOffset, // Slightly below the enemy
            enemy.radius * 1.2, // Shadow width
            enemy.radius * 1.2, // Shadow height (ellipse shape)
            0,
            0,
            Math.PI * 2
        );
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'; // Semi-transparent black for shadow
        ctx.fill();
        ctx.closePath();

        // Draw the black border (slightly larger than the enemy)
        const borderSize = 3; // Thickness of the black border
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius + borderSize, 0, Math.PI * 2);
        ctx.fillStyle = 'black'; // Border color
        ctx.fill();
        ctx.closePath();

        // Draw the enemy circle on top
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
        ctx.fillStyle = enemy.color; // Enemy color
        ctx.fill();
        ctx.closePath();

        // Draw the health number on top
        ctx.font = "25px 'Press Start 2P'";
        ctx.fillStyle = 'gold'; // Text color
        ctx.textAlign = 'center'; // Center align the text
        ctx.textBaseline = 'middle'; // Align vertically in the center
        ctx.fillText(enemy.health, enemy.x, enemy.y); // Draw health number at enemy position
    });
}




function drawScorePopups() {
    scorePopups.forEach((popup) => {
        ctx.font = '16px "Press Start 2P"';
        ctx.fillStyle = '#ffcb3b'; // Updated to the new color
        ctx.globalAlpha = popup.alpha;
        ctx.fillText(`+${popup.score}`, popup.x, popup.y);
        ctx.globalAlpha = 1; // Reset alpha to 1 for other drawing
    });
}

function drawRails() {
    ctx.globalCompositeOperation = 'source-over'; // Ensure standard layer drawing
    ctx.strokeStyle = 'grey';
    ctx.lineWidth = 4;

    // Draw static lines for the background, ensuring it doesn't overlap player/enemies
    const directionAngles = [
        Math.PI / 2, // Top
        Math.PI * 1.5, // Bottom
        0, // Right
        Math.PI, // Left
        Math.PI / 4, // Top-right diagonal
        Math.PI * 3 / 4, // Top-left diagonal
        Math.PI * 5 / 4, // Bottom-left diagonal
        Math.PI * 7 / 4, // Bottom-right diagonal
    ];

    // Draw these lines as background only
    directionAngles.forEach(angle => {
        ctx.beginPath();
        ctx.moveTo(player.x, player.y);
        ctx.lineTo(
            player.x + Math.cos(angle) * canvas.width,
            player.y + Math.sin(angle) * canvas.height
        );
        ctx.stroke();
        ctx.closePath();
    });
}




function drawExplosions() {
    explosions.forEach((explosion, index) => {
        // Draw the white outline (slightly larger than the explosion)
        const outlineSize = explosion.size * 0.2; // Outline grows proportionally to explosion size

        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, explosion.size + outlineSize, 0, Math.PI * 2);
        ctx.strokeStyle = 'white'; // White color for the outline
        ctx.lineWidth = 2; // Thickness of the outline stroke
        ctx.stroke();
        ctx.closePath();

        // Draw the explosion core (main color of the explosion)
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, explosion.size, 0, Math.PI * 2);
        ctx.fillStyle = explosion.color; // Explosion's main color (e.g., enemy's color)
        ctx.fill();
        ctx.closePath();

        // Increase the size of the explosion to simulate expansion
        explosion.size += 1.5; // Controls how quickly the explosion grows
        explosion.size = Math.min(explosion.size, explosion.maxSize); // Limit the size

        // Increase the fade rate for a faster fade
        explosion.alpha -= explosion.fadeRate * 3; // Increased factor for faster fading
        if (explosion.alpha <= 0) {
            explosions.splice(index, 1); // Remove explosion when it fades completely
        }
    });
}



function playGlowSound() {
    const audio = new Audio('glow-sound.mp3'); // Replace with your glow sound file
    audio.volume = 0.7; // Adjust the volume
    audio.play(); // Play the sound
}

function triggerPlayerGlow() {
    player.isGlowing = true;
    player.glowStartTime = performance.now(); // Record the start time of the glow
    // Play the glow sound
    playGlowSound();
}




function gameLoop(timestamp) {
    if (!gameStarted) {
        // If the game hasn't started, just show the start screen and exit early
        drawStartScreen(); // Show the "Press Any Button" screen over the player
        return;
    }

    if (gameOver) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.2)'; // Semi-transparent red overlay
        ctx.fillRect(0, 0, canvas.width, canvas.height); // Cover the canvas with red
        drawGameOver();  // Show the game over text
        return;
    }






    // Game logic
    updatePlayerDirection();
    updateBullets();
    updateEnemies();
    updateScorePopups();
    checkCollisions();
    updateSparks(); // Update sparks

  ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset the transformation to avoid affecting drawing

    // Turn off the glow if the duration has passed
    if (player.isGlowing && timestamp - player.glowStartTime > player.glowDuration) {
        player.isGlowing = false; // Stop glowing
    }
    // Draw the radial background
        drawBackground();

        // Draw the game elements
drawStartScreen();
            drawBackground();
            drawSwingAnimations();
            drawMuteButton();
            drawRails();
            drawPlayer();
            drawEnemies();
            drawMeleeBar();
            drawHealthBar();
            drawScore();
            drawEnemyKillCount();  // Draw the enemy kill counter here
            drawBullets();
            drawScorePopups();
            drawExplosions();
             drawSparks(); // Draw sparks
             // Draw mute button






    // Update total time passed in the game
   timeSinceStart = timestamp / 1000; // time in seconds
//Spawn Interval Numbers Tweak

   // Decrease spawn interval every 3 seconds
   if (timeSinceStart - lastTimeDecrease >= 7) {
       // Reduce the spawn interval, but don't go below the minimum value
       spawnInterval = Math.max(minSpawnInterval, spawnInterval - 10); // 100 is the speed rate reducing the spawn rate
       lastTimeDecrease = timeSinceStart; // Reset the time tracker

       // Log the updated spawn interval
       console.log(`New enemy spawn rate: ${spawnInterval} ms`);

       triggerPlayerGlow();
   }



    // Spawn enemies at regular intervals
      if (timestamp - lastSpawn > spawnInterval) {
        spawnEnemy();
        lastSpawn = timestamp;
    }
// fireBullet(timestamp); // Creates an automatic fire. Use for mobile release. Commented out for desktop.s
    requestAnimationFrame(gameLoop);  // Continue the game loop
}

function restartGame() {
    // Reset the game variables
    gameOver = false;
    player.health = 4;
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
    player.direction = Math.PI * 1.5, // Set initial direction to face up (90 degrees, or Math.PI * 1.5)
    score = 0;
    enemies = [];
    bullets = [];
    explosions = [];
    scorePopups = [];
    lastSpawn = 0;
    spawnInterval = 650; // Reset spawn interval
    player.meleeCharges = 4; // Reset melee charges




    // Start the game loop again
    requestAnimationFrame(gameLoop);
}

// Start the game loop initially
requestAnimationFrame(gameLoop);
