/*

POP! the game

Alex Robinson - 22/10/2011

description:
    Try to pop all the bubbles befor they reach the top line you can 
    click on the bubbles to shrink them down.  To help you you can use
    the power ups which will give you special powers.

Powers:
    1. super clicks = one click one bubble
    2. movement clicks = on move - click
    3. freez = freezs current state (no movement)
    4. bubble killer = sets bubbles array to []
*/

window.onload = function () {
    //-----STARTUP VARIBLES-------

    //grab canvas & set context
    var gameDisplay = document.getElementById("gameDisplay");
    var gameDisplayContext = gameDisplay.getContext('2d');

    //game featuress
    var running = false;
    var pause = false;
    var score = 0;
    var started = false;    //using this to only allow click to start

    //specifies the powers which are inculuded in the form [power, colour, duration]
    var includedPowers = [['super clicks', '#1B9BE0', 200], ['movement clicks', '#1BE084', 300], ['freez', 'E0E01B', 200], ['bubble killer', '#FF0080', 2]];

    //define enviroment (working in radians not degres)
    var gravity = {angle:Math.PI, length:0.1};
    var drag = 0.999;
    var elasticity = 0.75;
    var density = 10;
    var scale = 5;           //size of bubble compared to clicks

    var spawnRate = 0.9;
    var growRate = 0.99;
    var powerRate = 0.9;
    var bounsRate = 0.8;

    //powers
    var power = 'none';
    var powerDurationTotal = 0;                  //total duration (useing for working out percentage)
    var powerDuration = powerDurationTotal;

    //create an array to store bubble objects
    var bubbles = new Array();

    //line at which if bubbles go over you lose
    var cap = 50;

    //intial amount of bubbles
    var startingAmount = 10;

    //------FUNCTIONS---------

    //handle local score storage
    function updateLocalStorage() {
    
        //if local storage exsists
        if (localStorage.score != null) {
        
            //only update local store if current store is greater
            if (score > localStorage.score) {
                localStorage.score = score;
             }
        }
        
        //create local store
        else {
            localStorage.score = 0;
        }
        
        //write to topScore div
        document.getElementById('topScore').innerHTML = 'BEST: ' + localStorage.score;
    }
    
    //centers text in the x direction
    function centerText(text, x, size) {
        return 2 + x - ((text.toString().length) * (size/2)) / 2
        //text.toString().length*(size/2)+2, size+2)
    }
    
    
    //assign bouns
    function assignBouns() {
        
        if (Math.random() > 0.99) {
            return 300
        }
        
        else if (Math.random() > 0.9) {
            return 100
        }
        
        else if (Math.random() > 0.7) {
            return 50
        }
        
        else if (Math.random() > 0.5) {
            return 10
        }
        
        else {
            return 5
        }
    }
     
    //draws rect tangles
    function drawRect(position, size, colour) {

        //percentage = between 0 & 1 NOT 0 & 100
        gameDisplayContext.fillStyle = colour;
        gameDisplayContext.fillRect(position.x, position.y, size.x, size.y);
    }

    //assigns a power to a bubble
    function assignPower() {

        if (Math.random() > powerRate) {

            //power is between 0 and the length of includedPowers (length propertry starts at one, -1 to use 0 index)
            var power = Math.ceil(Math.random() * includedPowers.length-1);

            return includedPowers[power];
        }
        return 'none';
    }

    //draws text
    function drawText(text, colour, position, size, font) {

        gameDisplayContext.fillStyle = colour;
        
        gameDisplayContext.font = size + 'px ' + font;
        gameDisplayContext.textBaseline = 'middle';
        gameDisplayContext.textAlign = 'center';
        gameDisplayContext.fillText(text, position.x, position.y);
    }

    //creates the intial bubbles
    function spawnBubbles(num) {

        for (var b = 0; b < num; b++) {

            //creates random properties
            var clicks = Math.ceil(1 + Math.random() * (5));     //creates bubbles click value between 1 - 5

            //creates a random number between a range
            var x = Math.ceil(clicks * scale + (Math.random() * (gameDisplay.width - clicks * scale)));
            var y = Math.ceil(cap + clicks * scale + (Math.random() * ((gameDisplay.height - cap) + clicks * scale))); //spawns bellow cap randomly

            //colour & rate
            var rate = 1;
            var colour = '#000000';

            //creates new object
            var bubbleObj = new bubble({x:x, y:y}, colour, clicks, rate);

            //special power
            var p = assignPower();

            if (p != 'none') {
                bubbleObj.powerDurationTotal = p[2];
                bubbleObj.colour = p[1];
                bubbleObj.power = p[0];            //rember the actual power is held in index 0
            }
            
            //assign bouns
            if (Math.random() > bounsRate) {
                bubbleObj.bouns = assignBouns()
            }

            //pushs object onto array
            bubbles.push(bubbleObj);
        }
    }

    //check for collision
    function collide(bubble1, bubble2) {

        //find distance between x, y positions
        var dx = bubble1.x - bubble2.x;
        var dy = bubble1.y - bubble2.y;

        //find the distance between both bubbles
        var distance = Math.sqrt(dx*dx + dy*dy);

        if (distance < bubble1.size + bubble2.size){

            //finds angle of 'triangle (x, y, length)' and subtracts pi/2  (90 degres)
            var angle = Math.atan2(dy, dx) + Math.PI/2;

            //total mass will be used for momentum
            var totalMass = bubble1.mass + bubble2.mass;

            //calculates new vectors for both bubbles talking into account momentum

            //let v = velocity, u = velocity befor collision, m = mass (http://en.wikipedia.org/wiki/Elastic_collision#One-dimensional_Newtonian)
            var v1 = bubble1.speed * (bubble1.mass - bubble2.mass) / totalMass;      //v1 = u1(m1 - m2) / m1 + m2
            var v2 = (2 * (bubble2.speed * bubble2.mass)) / totalMass;               //v2 = 2(u2 * m2) / m1 + m2

            var vector = addVectors({angle:bubble1.angle, length:v1}, {angle:angle, length:v2});
            bubble1.angle = vector[0];
            bubble1.speed = vector[1] * elasticity;

            //other bubble...
            var v1 = bubble2.speed * (bubble2.mass - bubble1.mass) / totalMass;      //v1 = u2(m2 - m1) / m1 + m2
            var v2 = (2 * (bubble2.speed * bubble1.mass)) / totalMass;               //v2 = 2(u2 * m1) / m1 + m2

            var vector = addVectors({angle:bubble2.angle, length:v1}, {angle:angle + Math.PI, length:v2});
            bubble2.angle = vector[0];
            bubble2.speed = vector[1] * elasticity;

            //find distance the bubbles have overlaped
            var overlap = (bubble1.size + bubble2.size - distance+1)/2;

            //moves bubbles along the tangent between bubbles
            bubble1.x += Math.sin(angle) * overlap;
            bubble1.y -= Math.cos(angle) * overlap;
            bubble2.x -= Math.sin(angle) * overlap;
            bubble2.y += Math.cos(angle) * overlap;

            //add to touching (cant push directly onto array)
            bubble1.touching += 1;
            bubble2.touching += 1;
        }
    }

    //Combiens two spherical vectors
    function addVectors(v1, v2) {

        //adds vectors, and finds x, y where bubble would end up by following vectors
        var x = Math.sin(v1.angle) * v1.length + Math.sin(v2.angle) * v2.length;
        var y = Math.cos(v1.angle) * v1.length + Math.cos(v2.angle) * v2.length;

        //calculates new vector which would go to the x, y position directily (hypotenuse)
        var length = Math.sqrt(x*x + y*y);

        //finds angle of 'triangle (x, y, length)' and subtracts pi/2  (90 degres)
        var angle = Math.PI/2 - Math.atan2(y, x);
        return [angle, length];
    }

    //clears the canvas
    function clearCanvas() {
        gameDisplayContext.clearRect(0, 0, gameDisplay.width, gameDisplay.height);
    }

    //-----BUBBLE CLASS------

    //create the bubble class
    function bubble(position, colour, clicks, rate) {

        //----PROPITIES----

        this.x = position.x;
        this.y = position.y;
        this.colour = colour;
        this.clicks = clicks;                //number of clicks needed to destroy ball
        this.size = this.clicks * scale;     //clicks * the scale
        this.rate = 1;                       //rate at which the bubble expands
        this.speed = 0;
        this.angle = 0;
        this.mass = this.size * density;     //mass is directly preportional to size
        this.touching = 0;                   //how meny other bubbles are being touched by the particle
        this.power = 'none';                 //what power...
        this.powerDurationTotal = 0;
        this.bouns = 0


        //----METHORDS----

        //draws the bubble onto the canvas
        this.draw = function() {

            var x = Math.round(this.x);
            var y = Math.round(this.y);
            
            gameDisplayContext.fillStyle = this.colour;
                        
            gameDisplayContext.beginPath();
            gameDisplayContext.arc(x, y, this.size, 0, Math.PI*2, true);
            gameDisplayContext.closePath();
            
            gameDisplayContext.fill();            
            
            if (this.bouns > 0) {
                //alert(centerText(this.bouns, x, 10))
                drawText(this.bouns, '#FFFFFF', {x:x, y:y}, 10, 'Calibri')
            }
        }

        //grows the bubbles by the rate
        this.grow = function() {

            this.clicks += rate;
            this.size = this.clicks * scale;
            this.mass = this.size * density;
        }

        //shrink bubble on click
        this.shrink = function() {

            this.clicks--
            this.size = this.clicks * scale;
            this.mass = this.size * density;
        }

        //moves bubble
        this.move = function() {

            //moves bubble along angle with a magnitude of speed
            this.x += Math.sin(this.angle) * this.speed;
            this.y -= Math.cos(this.angle) * this.speed;

            //creates a new angle speed taking gravity into account and drag
            var vector = addVectors({angle:this.angle, length:this.speed}, gravity);
            this.angle = vector[0];
            this.speed = vector[1] * drag;
        }

        //bounce bubble of walls
        this.bounce = function() {

            //bounce off wall x = width
            if (this.x > gameDisplay.width - this.size) {

                this.x = 2 * (gameDisplay.width - this.size) - this.x;
                this.angle = -this.angle;
                this.speed *= elasticity;
            }

            //bounce of wall x = 0
            else if (this.x < this.size){

                this.x = 2 * this.size - this.x;
                this.angle = -this.angle;
                this.speed *= elasticity;
            }

            //bounce of wall y = height
            if (this.y > gameDisplay.height - this.size) {

                this.y = 2 * (gameDisplay.height - this.size) - this.y;
                this.angle = Math.PI - this.angle;
                this.speed *= elasticity;
            }

            //bounce of wall y = 0
            else if (this.y < this.size) {

                this.y = (2 * this.size) - this.y;
                this.angle = Math.PI - this.angle;
                this.speed *= elasticity;
            }
        }
    }

    //-------GAME LOOP------

    //game loop which checks everything
    function gameLoop() {

        if (pause == false) {

            //update score
            score++;

            //clears canvas & draws cap writes score
            clearCanvas();
            drawRect({x:0, y:cap}, {x:gameDisplay.width, y:1}, '#FF0000');
            drawText(score, '#555555', {x:gameDisplay.width/2, y:cap/2}, 20, 'Calibri');

            //power duration
            if (powerDuration > 0) {
                powerDuration--;

                //draw power duration bar
                drawRect({x:0, y:5}, {x:gameDisplay.width*powerDuration/powerDurationTotal, y:2}, '#555555');

                //if power duration is 0 then power over
                if (powerDuration == 0) {
                    power = 'none';
                    powerDurationTotal = 0;
                    powerDuration = powerDurationTotal;
                }
            }

            //spawns new bubbles randomly
            if (Math.random() > spawnRate && power != 'freez') {
            
                spawnBubbles(1)
            }

            for (var b in bubbles) {

                //removes all bubbles if power = 'bubble killer'
                if (power == 'bubble killer') {
                    bubbles = [];
                    break;
                }

                //only updates when power is not freezen
                if (power != 'freez') {

                    //bubbles grow randomly
                    if (Math.random() > growRate)
                        bubbles[b].grow();

                    //update position & checks boundries
                    bubbles[b].bounce();
                    bubbles[b].move();
                }

                //check for collisions
                for (var b2 in bubbles){
                    if (b2 != b) {
                       collide(bubbles[b], bubbles[b2]);
                    }
                }

                //check if bubbles are over the cap and are tourching at least 2 other bubbles
                if (bubbles[b].y - bubbles[b].size < cap && bubbles[b].touching >= 2) {
                    running = false;
                }

                //clear how meny touchs so touchs dont continue to next loop
                bubbles[b].touching = 0;

                //draw bubbles
                bubbles[b].draw();
            }

            if (running == false) {
                started = true      //only allows click on start so dont over shoot
                clearInterval(this.main);
                updateLocalStorage()

                //game over screen
                drawRect({x:0, y:0}, {x:gameDisplay.width, y:gameDisplay.height}, 'rgba(50, 50, 50, 0.8)')

                drawRect({x:0, y:80}, {x:gameDisplay.width, y:100}, 'rgba(50, 50, 50, 0.8)')
                
                drawText('YOU SCORED ' + score + ' POINTS!', '#FFFFFF', {x:gameDisplay.width/2, y:60}, 20, 'Calibri');
                drawText('                ' + score + '        ', '#FF0000', {x:gameDisplay.width/2, y:60}, 20, 'Calibri');

                drawText('GAME OVER', '#FFFFFF', {x:gameDisplay.width/2, y:130}, 80, 'Impact');
                drawText('press any key to restart', '#999999', {x:gameDisplay.width/2, y:200}, 15, 'Calibri');
                
            }
        }
    }

    //-----MAIN LOOP------

        function game() {

            //have to re deffine all game varibles so this can be called on restart
            running = true;
            pause = false;
            score = 0;
            power = 'none';
            powerDurationTotal = 0;
            powerDuration = powerDurationTotal;

            bubbles = new Array();

            //colour background
            gameDisplay.style.backgroundColor = '#FFFFFF'
            
            //intial bubbles
            spawnBubbles(startingAmount);

            //GAME!
            this.main = setInterval(gameLoop, 35);
        }

    //---EVENT LISTENERS---

    //check for click events
    gameDisplay.addEventListener('click', function(e) {

            if (pause == false) {

                //offset mouse positions (mouse starts at top of scree)
                
                if (!e.pageX) {
                    var y = e.screenY -50;
                    var x = e.screenX - (dcoument.body.clientWidth - gameDisplay.width)/2;
                } else {
                    var y = e.pageY - 50;                                     //this is the top margin set for the canvas
                    var x = e.pageX - (document.body.clientWidth - gameDisplay.width)/2;
                }
                //check distanc between bubble and mouse
                for (b in bubbles) {

                    //find distance between x, y positions of mouse and bubble
                    var dx = x-bubbles[b].x;
                    var dy = y-bubbles[b].y;

                    //find the distance between bubble and mouse
                    if (Math.sqrt(dx*dx + dy*dy) <= bubbles[b].size) {

                        //if mouse is tourching...
                        bubbles[b].shrink();

                        //remove bubble from array
                        if (bubbles[b].size <= 0 || power == 'super clicks') {

                            //assigns the power of the bubble to our overall power
                            if (bubbles[b].power != 'none') {
                                power = bubbles[b].power;
                                powerDurationTotal = bubbles[b].powerDurationTotal;
                                powerDuration = powerDurationTotal;
                            }

                            score += bubbles[b].bouns
                            bubbles.splice(b, 1);

                        }
                    }
                }
                
                //only allows click to start on home screen because you may over click
                if(running == false && started == false){
                    game();
                }
            }
        }, false);

    //check for mouseMovent to use with powers
    gameDisplay.addEventListener('mousemove', function(e) {

        //no need unless power is 'movement clicks'
        if (power == 'movement clicks' && pause == false) {

            //offset mouse positions
            if (!e.pageX) {
                var y = e.screenY - 50;
                var x = e.screenX - (document.body.clientWidth - gameDisplay.width)/2;
            } else {
                var y = e.pageY - 50;                    //this is the top margin set for the canvas
                var x = e.pageX - (document.body.clientWidth - gameDisplay.width)/2;
            }
            //check distance between each bubble
            for (b in bubbles) {

                //find distance between x, y positions of mouse and bubble
                var dx = x-bubbles[b].x;
                var dy = y-bubbles[b].y;

                //find the distance between bubble and mouse
                if (Math.sqrt(dx*dx + dy*dy) <= bubbles[b].size) {

                    //if mouse is tourching...
                    bubbles[b].shrink();

                    //remove bubble from array
                    if (bubbles[b].size <= 0) {

                        //assigns the power of the bubble to our overall power
                        if (bubbles[b].power != 'none') {
                            power = bubbles[b].power;
                            powerDurationTotal = bubbles[b].powerDurationTotal;
                            powerDuration = powerDurationTotal;
                        }
                        
                        score += bubbles[b].bouns
                        bubbles.splice(b, 1);
                    }
                }
            }
        }
    }, false);

    //check for keyboard events
    addEventListener('keypress', function(key) {

        //if key = space bar, invers pause
        if (key.charCode == 32 && running == true) {
            pause = !pause;

            if (pause == true) {
                drawRect({x:0, y:0}, {x:gameDisplay.width, y:gameDisplay.height}, 'rgba(50, 50, 50, 0.6)')
                
                drawText('PAUSED', '#FFFFFF', {x:gameDisplay.width/2, y:gameDisplay.height/2}, 15, 'Calibri');
            }
        }

        //if enter then restart the game
        else if(running == false){
            game();
        }

    })

    //----START GAME----- (only triggerd on first page load)
    
    updateLocalStorage()
    
    //title screen               

    drawRect({x:0, y:30}, {x:gameDisplay.width, y:129}, 'rgba(50, 50, 50, 0.2)')
    
    //images
    var titleImage = new Image();
    titleImage.src = 'images/title.gif'; 
    titleImage.onload = function(){   
        gameDisplayContext.drawImage(titleImage,gameDisplay.width/2-197/2,40,197,109);    
    }  
    var subtitleImage = new Image();
    subtitleImage.src = 'images/subtitle.gif'; 
    subtitleImage.onload = function(){   
        gameDisplayContext.drawImage(subtitleImage,245,160,105,35);    
    }  
    
    //text and info
    drawText('press any key to start', '#999999', {x:gameDisplay.width/2, y:200}, 15, 'Calibri');
    drawText('Pop bubbles before they reach the top line, click bubbles to shrink them.', '#CCCCCC', {x:gameDisplay.width/2, y:230}, 15, 'Calibri');
    drawText('The bubbles will grow and spawn randomly.  Special powers (coloured', '#CCCCCC', {x:gameDisplay.width/2, y:250}, 15, 'Calibri');
    drawText(' bubbles) and bounus will help you get a top score.', '#CCCCCC', {x:gameDisplay.width/2, y:270}, 15, 'Calibri');
    
    gameDisplay.style.backgroundColor = '#555555'

}
