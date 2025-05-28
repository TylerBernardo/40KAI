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

var intercessorModel = new unitUtil.Unit(6,4,3,2,boltRifle,boltRifle)


var testUnit = new unitUtil.UnitWrapper(testBoard.getTile(2,2),"Test Unit",[intercessorModel.clone()])
//testUnit.move(testBoard.getTile(3,3))

var testUnit2 = new unitUtil.UnitWrapper(testBoard.getTile(2,2),"Test Unit2",[intercessorModel.clone()])
var testPlayer = new playerUtil.Warhammer_AI_Player(1,testBoard)
testPlayer.addUnit(testUnit)
testPlayer.addUnit(testUnit2)

//testUnit2.attackUnitRanged(testUnit)

async function demo(socket){
  for(var i = 0; i < 10; i++){
    testPlayer.movement(testUnit)
    io.emit("setModel",testUnit.currentTile.x,testUnit.currentTile.y,"testUnit","1")
    await delay(1000)
    testPlayer.movement(testUnit2)
    io.emit("setModel",testUnit2.currentTile.x,testUnit2.currentTile.y,"testUnit2","2")
    await delay(1000)
  }
}


app.get('/', (req, res) => {
  //res.send('Hello World!\n' + testBoard.printBoardFormatted());
  res.sendFile(__dirname + '/UI/index.html')
});

io.on('connection', (socket) => {
  console.log("user connected")

  socket.on("ready", () => {
    console.log("user is ready")
    io.emit("buildTable",30,22)
    io.emit("setModel",testUnit.currentTile.x,testUnit.currentTile.y,"testUnit","1")
    io.emit("setModel",testUnit2.currentTile.x,testUnit2.currentTile.y,"testUnit2","2")
    demo(socket)
  })
})

server.listen(3000, () => {
  console.log('server initialized');
});