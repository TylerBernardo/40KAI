//import server packages
import express from 'express';
import http from "http"
//create __dirname
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

//40k AI files
import * as boardUtil from "./gameEngine/board.ts";
import * as unitUtil from "./gameEngine/units.ts"
import * as diceUtil from "./gameEngine/dice.ts"
import * as playerUtil from "./gameEngine/player.ts"
//create express app
const app = express();
const server = http.createServer(app)
import {Server} from "socket.io"
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

var intercessorModel = new unitUtil.Unit(6,4,3,2,[boltRifle],[boltRifle],"Intercessor")

console.log(JSON.stringify(intercessorModel))


var testUnit = new unitUtil.UnitWrapper(testBoard.getTile(5,5),"Test Unit",[intercessorModel.clone()])
//testUnit.move(testBoard.getTile(3,3))

var testUnit2 = new unitUtil.UnitWrapper(testBoard.getTile(5,6),"Test Unit2",[intercessorModel.clone()])
var testPlayer = new playerUtil.Warhammer_AI_Player(1,testBoard)
testPlayer.addUnit(testUnit)
testPlayer.addUnit(testUnit2)

let spaceMarineCombatPatrol: unitUtil.UnitWrapper[] = unitUtil.unitsFromFile("spaceMarines.json",testBoard)
let testPlayer2 = new playerUtil.Warhammer_AI_Player(2,testBoard);
for(let unit of spaceMarineCombatPatrol){
  testPlayer2.addUnit(unit);
}
testPlayer.setOpponent(testPlayer2);
testPlayer2.setOpponent(testPlayer);

//testUnit2.attackUnitRanged(testUnit)

async function demo(socket){
  await delay(3000);
  for(var i = 0; i < 10; i++){
    testPlayer.turn()
    await updatePositions(testPlayer)
    await delay(1000)
    testPlayer2.turn()
    await updatePositions(testPlayer2)
    await delay(1000)
  }
}
//sends all information about the model to the client
async function updateUnitData(unit: unitUtil.UnitWrapper){
  //convert the unit to a JSON object that can be sent
  let toSend = {
    name:unit.name,
    //position:[unit.currentTile.x,unit.currentTile.y],
    x:unit.currentTile.x,
    y:unit.currentTile.y,
    units:unit.units.map((value:unitUtil.Unit) => JSON.parse(JSON.stringify(value)))
  }
  //send the updated object
  io.emit("updateUnit",toSend);
}

//sends the client all the data about a player's units
async function updatePlayerUnitData(player: playerUtil.Warhammer_AI_Player){
  for(let unit of player.units){
    await updateUnitData(unit);
  }
}
//update the position of every unit a player owns
async function updatePositions(player: playerUtil.Warhammer_AI_Player){
  for(let unit of player.units){
    io.emit("setModel",unit.currentTile.x,unit.currentTile.y,unit.name,player.playerNum.toString())
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
    io.emit("buildTable",30,22)
    await updatePlayerUnitData(testPlayer)
    await updatePositions(testPlayer)
    await updatePlayerUnitData(testPlayer2)
    await updatePositions(testPlayer2)
    
    await demo(socket)
  })
})

server.listen(3000, () => {
  console.log('server initialized');
});