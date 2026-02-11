import {Config, Population, Genome} from "neat-javascript"
import * as PCA from "pca-js"
import * as boardUtil from ".././gameEngine/board.ts";
import * as unitUtil from ".././gameEngine/units.ts"
import * as diceUtil from ".././gameEngine/dice.ts"
import * as playerUtil from ".././gameEngine/player.ts"

const BOARD_HEIGHT = 30
const BOARD_WIDTH = 44

const config = new Config({
  // Basic network structure
  //each space gets 3 inputs asspcoated with it, whether it has a friendly unit, whether it has an enemny unit, and whether it is within range of an objective
  //there are 2 inputs representing the target space, and two inputs representing the current space
  //TODO: decide which unit starts are important for making these moves
  inputSize: BOARD_HEIGHT*BOARD_WIDTH+4,                    // Number of input nodes
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
  populationSize: 2**7,             // Size of the population
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

const config2 = new Config({
  // Basic network structure
  //each space gets 3 inputs asspcoated with it, whether it has a friendly unit, whether it has an enemny unit, and whether it is within range of an objective
  //there are 2 inputs representing the target space, and two inputs representing the current space
  //TODO: decide which unit starts are important for making these moves
  inputSize: BOARD_HEIGHT*BOARD_WIDTH+4,                    // Number of input nodes
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
const p2 = new Population(config2)

//run a match between two genomes, return the winner
function match(player1G: Genome, player2G: Genome): 1 | 2 | undefined{
  var board= boardUtil.Board.fromFile("data/clashOfPatrols.json")//new boardUtil.Board(22,30)
  let player1 = playerUtil.AiPlayerFromFile("data/spaceMarines.json",board,1,player1G)
  // player1.io = io
  let player2 = playerUtil.AiPlayerFromFile("data/spaceMarines.json",board,2,player2G)
  player1.setOpponent(player2)
  player2.setOpponent(player1)
  for(let turn = 1; turn <= 5; turn++){
    player1.turn()
    player2.turn()
  }
  if(player1.score == player2.score){return undefined}
  return player1.score > player2.score ? 1 : 2
}

function bestOfN(player1G: Genome, player2G: Genome, n: number):[number,number,number]{
  let results: [number,number,number] = [0,0,0]
  for(let i = 0; i < n; i++){
    let result = match(player1G,player2G)
    if(result == 1){
      results[0]++
    }else if(result == 2){
      results[1]++
    }else{
      results[2]++
    }
  }
  return results
}

function tournament(population:Population, matches:number){
    let participants = population.genomes
    let rounds = Math.ceil(Math.log2(participants.length))
    for(let r = 1; r <= rounds; r++){
      let newParticpants: Array<Genome> = []
      for(let i = 0; i < participants.length; i += 2){
        //do a best of N matches with the two participants
        let result = bestOfN(participants[i],participants[i+1],matches)
        if(result[0] > result[1]){
          newParticpants.push(participants[i])
          participants[i+1].fitness = 2**(r-1) + 1/result[0]
          console.log('Genome ',participants[i+1].id.toString(),' has been eliminated')
        }else if (result[1] > result[0]){
          newParticpants.push(participants[i+1])
          participants[i].fitness = 2**(r-1) + 1/result[1]
          console.log('Genome ',participants[i].id.toString(),' has been eliminated')
        }else{
          //tie, pick one at random
          let winner = Math.round(Math.random())
          newParticpants.push(participants[i+winner])
          participants[i+1-winner].fitness = 2**(r-1) + 1/result[winner]
          console.log('Genome ',participants[i+1-winner].id.toString(),' has been eliminated')
        }
      }
      //set the participants for the next round
      participants = newParticpants
    }
    //set the winner's score
    participants[0].fitness = 2**rounds
    console.log('Genome ', participants[0].id.toString(), ' has won!')
}

function optimizedPropagate(boardBitmap: Array<Array<number>>, otherInputs: Array<number>, genome: Genome){
  //convert the high dimension data into a lower dimension
  let vectors = PCA.getEigenVectors(boardBitmap)
  let adData = PCA.computeAdjustedData(boardBitmap,vectors[0])
  let newInput = adData.adjustedData[0].concat(otherInputs)
  return genome.propagate(newInput)
}

let testBoard= boardUtil.Board.fromFile("data/clashOfPatrols.json")
let player1 = playerUtil.AiPlayerFromFile("data/spaceMarines.json",testBoard,1,population.genomes[0])

 // player1.io = io
let player2 = playerUtil.AiPlayerFromFile("data/spaceMarines.json",testBoard,2,population.genomes[1])
  //player2.io = io
player1.setOpponent(player2)
player2.setOpponent(player1)

//for(let g = 1; g <= config.generations; g++){
  //console.log("Generation " + g)
//}
/*
let dimInputs: Array<Array<number>> = player1.generateBitmap3D()//new Array<number>(BOARD_HEIGHT * BOARD_WIDTH).fill(0).map((value,index) => new Array<0|1>(4).fill(0).map((value) => Math.round(Math.random())))
let otherInputs = [1,1,4,3]
let inputs = dimInputs.flat().concat(otherInputs)//new Array(config.inputSize)
let testGenome = population.genomes[0]
console.profile("singlePropagate")
testGenome.propagate(inputs)
console.profileEnd("singlePropagate")

console.profile("optimized")
console.log(optimizedPropagate(dimInputs,otherInputs,p2.genomes[0]))
console.profileEnd("optimized")
*/

console.time()
tournament(population,2)
console.timeEnd()

//console.profile("bestOf2")
//console.log(bestOfN(population.genomes[0],population.genomes[1],2))
//console.profileEnd("bestOf2")