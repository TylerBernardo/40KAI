//import server packages
import express from 'express';
import http from "http"
//create __dirname
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { readFileSync } from 'fs';

import {Config, Population, Genome} from "neat-javascript"


//40k AI files
import * as boardUtil from "./gameEngine/board.ts";
import * as unitUtil from "./gameEngine/units.ts"
import * as diceUtil from "./gameEngine/dice.ts"
import * as playerUtil from "./gameEngine/player.ts"
//create express app
const app = express();
const server = http.createServer(app)
import {Server} from "socket.io"
import { doesNotMatch } from 'assert';
const io = new Server(server)

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

app.use(express.static(__dirname + '/UI'))

//test dice class
/*
var testDice = new diceUtil.Dice("D3+2D6+2")
var total = 100000;
var average = 0;
var results = Array(17).fill(0);
for(var i = 0; i < total; i++){
  var testRoll = testDice.roll();
  var testStat = testRoll/total
  average += testStat;
  results[testRoll] += 1;
}
console.log(average);
console.log(results)
for(var index in results){
  console.log((index) + ": " + Math.round(results[index]*100/total))
}
*/
var testBoard= new boardUtil.Board(22,30)

var boltRifle: unitUtil.Weapon = new unitUtil.Weapon(3,3,3,4,[],24,1)

//var intercessorModel = new unitUtil.Unit(6,4,3,2,[boltRifle],[boltRifle],"Intercessor")

//console.log(JSON.stringify(intercessorModel))



//testUnit2.attackUnitRanged(testUnit)

async function demo(socket){
  let testBoard= boardUtil.Board.fromFile("data/clashOfPatrols.json")//new boardUtil.Board(22,30)

  io.emit("buildTable",testBoard.width,testBoard.height)
  const config = new Config({
    // Basic network structure
    //each space gets 4 inputs asspcoated with it, whether it has a friendly unit, whether it has an enemny unit, whether it is within range of an objective, and whether it blocks line of sight
    //there are 2 inputs representing the target space, and two inputs representing the current space
    //TODO: decide which unit starts are important for making these moves
    inputSize: testBoard.width*testBoard.height*4+4,                    // Number of input nodes
    //returns a number representing how much the agent wants to move to his space
    outputSize: 1,                   // Number of output nodes
    
    // Activation function (string-based selection)
    activationFunction: 'Sigmoid',   // Options: 'Sigmoid', 'NEATSigmoid', 'Tanh', 'ReLU', 'LeakyReLU', 'Gaussian'
    
    // Bias settings
    bias: 1.0,                       // Bias value
    connectBias: true,               // When true, automatically connects the bias node to all output nodes during network construction
    biasMode: 'WEIGHTED_NODE',       // Bias implementation mode
    
    
    // Weight initialization
    weightInitialization: {
      type: 'Random',
      params: [-1, 1]                // Min and max values for random weights
    },
    
    // Network topology parameters
    c1: 1.0,                         // Coefficient for excess genes
    c2: 1.0,                         // Coefficient for disjoint genes
    c3: 0.4,                         // Coefficient for weight differences
    compatibilityThreshold: 3.0,     // Species compatibility threshold
    interspeciesMatingRate: 0.001,   // Rate of interspecies mating
    
    // Mutation parameters
    mutationRate: 1.0,               // Overall mutation rate
    weightMutationRate: 0.8,         // Mutation rate for weights
    addConnectionMutationRate: 0.05, // Rate for adding new connections
    addNodeMutationRate: 0.03,       // Rate for adding new nodes
    minWeight: -4.0,                 // Minimum allowed weight
    maxWeight: 4.0,                  // Maximum allowed weight
    reinitializeWeightRate: 0.1,     // Rate to completely reinitialize weights
    minPerturb: -0.5,                // Minimum perturbation value
    maxPerturb: 0.5,                 // Maximum perturbation value
    
    // Evolution parameters
    //ensure the population size is an even power of two so a bracket can be run
    populationSize: 2,             // Size of the population
    generations: 100,                // Number of generations
    targetFitness: 0.95,             // Target fitness to achieve
    survivalRate: 0.2,               // Proportion that survives each generation
    numOfElite: 10,                  // Number of elite individuals to retain
    dropOffAge: 15,                  // Maximum age before dropping off
    populationStagnationLimit: 20,   // Generations with no improvement before reset
    keepDisabledOnCrossOverRate: 0.75, // Probability of keeping connections disabled during crossover if they are disabled in either parent
    mutateOnlyProb: 0.25,            // Probability for mutation-only
    
    // Recurrent network options
    allowRecurrentConnections: true, // Allow recurrent connections
    recurrentConnectionRate: 1.0     // Rate for recurrent connections
  });
  
  const population: Population = new Population(config)
  await updateBoardData("data/clashOfPatrols.json")
  for(let m = 0; m < 300; m++){
    population.genomes[0].mutate()
    population.genomes[1].mutate()
  }
  let player1 = playerUtil.AiPlayerFromFile("data/spaceMarines.json",testBoard,1,population.genomes[0])
 // player1.io = io
  let player2 = playerUtil.AiPlayerFromFile("data/spaceMarines.json",testBoard,2,population.genomes[1])
  //player2.io = io
  player1.setOpponent(player2)
  player2.setOpponent(player1)

  await updatePlayerUnitData(player1)
  await updatePlayerUnitData(player2)
  
  for(let turn = 1; turn <= 5; turn++){
    console.log("Turn " + turn.toString())
    await delay(5000)
    player1.turn()
    await updatePlayerUnitData(player1)
    await updatePlayerUnitData(player2)
    player2.turn()
    await updatePlayerUnitData(player1)
    await updatePlayerUnitData(player2)
  }

  console.log("done")

}
//sends all information about the board to the client
async function updateBoardData(filePath){
  let data:string = readFileSync(filePath,{encoding:'utf8'})
  io.emit("boardInfo", JSON.parse(data))
}

//sends all information about the model to the client
async function updateUnitData(unit: unitUtil.UnitWrapper, playerNum: number){
  //convert the unit to a JSON object that can be sent
  let toSend = {
    name:unit.name + playerNum.toString(),
    //position:[unit.currentTile.x,unit.currentTile.y],
    x:unit.currentTile.x,
    y:unit.currentTile.y,
    units:unit.units.map((value:unitUtil.Unit) => JSON.parse(JSON.stringify(value))),
    player: playerNum,
    dead:unit.dead
  }
  //send the updated object
  io.emit("updateUnit",toSend);
}

//sends the client all the data about a player's units
async function updatePlayerUnitData(player: playerUtil.Warhammer_AI_Player){
  for(let unit of player.units){
    await updateUnitData(unit,player.playerNum);
  }
  //await updatePositions(player)
}
//update the position of every unit a player owns
async function updatePositions(player: playerUtil.Warhammer_AI_Player,){
  for(let unit of player.units){
    io.emit("setModel",unit.currentTile.x,unit.currentTile.y,unit.name + player.playerNum.toString(),player.playerNum.toString())
  }
}


app.get('/', (req, res) => {
  //res.send('Hello World!\n' + testBoard.printBoardFormatted());
  res.sendFile(__dirname + '/UI/index.html')
});

io.on('connection', (socket) => {
  console.log("user connected")

  socket.on("ready", async () => {
    console.log("user is ready")
    
    
    await demo(socket)
  })
})

server.listen(3000, () => {
  console.log('server initialized');
});