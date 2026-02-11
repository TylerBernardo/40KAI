import {Board,BoardObject,Tile,Terrain} from "./board.ts"
import * as diceUtils from "./dice.ts"
import { Unit, unitsFromFile, UnitWrapper, Weapon } from "./units.ts"
import {dgpbinom} from "../stats/gpbd.ts"
import { weaponObjectToGPBD } from "../stats/warhammer.ts"
import {Genome} from "neat-javascript"
//Generic interface for a warhammer player that must be implemented TODO: Revisit what is included in this class
class WarhammerPlayer{
    playerNum: 1 | 2 = 1;
    board:Board;
    units:UnitWrapper[] = []
    opponent:WarhammerPlayer;
    io: undefined | any = undefined
    score: number = 0
    constructor(_playerNum:1 | 2,board:Board){
        this.playerNum = _playerNum;
        this.board = board;
    }

    setOpponent(newOpponent:WarhammerPlayer):void{
        this.opponent = newOpponent;
    }

    addUnit(toAdd:UnitWrapper):void{
        this.units.push(toAdd);
        //update the tile the unit is placed on
    }


    //each class that implements WarhammerPlayer should implement these functions
    movement(currentUnit:UnitWrapper, bitmap: Array<0|1>){}
    decideShooting(currentUnit:UnitWrapper){}
    turn(){}
    //TODO: Add charging
}

class Warhammer_AI_Player extends WarhammerPlayer{
    genome: Genome;
    constructor(playerNum:1|2,board:Board,genome: Genome){
        super(playerNum,board)
        this.genome = genome;
    }

    sortCompare(a:[number,any],b:[number,any]):number{
        return b[0] - a[0];
    }

    evaluateMove(currentUnit:UnitWrapper,moveCords:[number,number],boardmap: Array<number>):number{
        let inputs: Array<number> = boardmap
        inputs = inputs.concat([currentUnit.currentTile.x,currentUnit.currentTile.y,moveCords[0],moveCords[1]])
        return this.genome.propagate(inputs)
        //TODO: Check if move puts you in engagement range of an enemy operative
        //let inputs = [currentDistanceToEnemies,newDistanceToEnemies,this.board.distance(currentUnit.currentTile,this.board.getTile(moveCords[0],moveCords[1])),currentUnit.save,currentUnit.defense,currentUnit.wounds,currentUnit.rangedWeapon.range]
        //for now choose a random probability for this move
        //return Math.random();
    }
    
    //score how good a certain shot is
    evaluateShot(attacker:UnitWrapper,target:UnitWrapper):number{
        let score: number = 0
        let distance: number = Board.distance(attacker.currentTile,target.currentTile);
        //get all the weapons combined into bigger profiles
        let weapons: Weapon[] = attacker.getRangedWeapons(distance);
        if(weapons.length == 0){
            return
        }
        //turn the weapons list into probabilities
        let weaponStats = weapons.map((value)=>weaponObjectToGPBD(value,target.units[0].save,target.units[0].toughness))
        let joinedStats = {
            "prs":weaponStats.reduce((previous,current) => previous.concat(current.prs), [] as number[]),
            "ps":weaponStats.reduce((previous,current) => previous.concat(current.ps), [] as number[]),
            "qs":weaponStats.reduce((previous,current) => previous.concat(current.qs), [] as number[])
        }
        //calculate the distribution
        let distribution: number[] = dgpbinom(null,joinedStats.prs,joinedStats.ps,joinedStats.qs)
        //calculate the average damage and the 95th percentile damage
        let probLeft: number = 1;
        let average: number = distribution.reduce((sum,value,index) => sum + value * index,0), mostLikely: number = -1;
        for(let i = 0; i < distribution.length; i++){
            let p = distribution[i]
            probLeft -= p;
            if(mostLikely == -1 && probLeft < .95){
                mostLikely = i
                break;
            }
        }
        score += average + mostLikely * 3
        return score;
    }

    movement(currentUnit:UnitWrapper, boardmap: Array<number>):void{
        let possibleMoves = this.board.getValidMoves(currentUnit.currentTile,currentUnit.movement);
        //select move at random currently. This will eventually be done with the ai
        let evalMoves:Array<[number,[number,number]]> = Array<[number,[number,number]]>(possibleMoves.length);
        for(var i = 0; i < possibleMoves.length; i++){
            evalMoves[i] = [this.evaluateMove(currentUnit,possibleMoves[i],boardmap),possibleMoves[i]]
        }
        //account for charges
        /*
        for(var cTarget of this.opponent.units){
            if(this.board.distance(operative.currentTile,cTarget.currentTile) <= operative.movement + 2){
                possibleMoves.push([this.evaluateMove(operative,[cTarget.currentTile.x,cTarget.currentTile.y]),[cTarget.currentTile.x,cTarget.currentTile.y]])
            }
        }
            */
        //possibleMoves.sort(this.sortCompare)
        evalMoves.sort(this.sortCompare)
        for(let move of evalMoves){
            if(Math.random() <= move[0]){
                currentUnit.move(this.board.getTile(move[1][0],move[1][1]))
                return;
            }
        }
    
    }

    decideShooting(currentUnit:UnitWrapper): void{
        //check if shooting is even possible for this operative
        let possibleTargets:Array<[number,UnitWrapper]> = Array<[number,UnitWrapper]>(0);
        for(let target of this.opponent.units){
            //evaluate all possible targets
            if(!target.dead && Board.distance(currentUnit.currentTile,target.currentTile) <= currentUnit.largestRange){
                possibleTargets.push([this.evaluateShot(currentUnit,target),target])
            }
        }
        //console.log("Possible targets for " + currentUnit.name,possibleTargets)
        if(possibleTargets.length == 0){
            return
        }
        //take the shot with the highest ranking
        possibleTargets.sort(this.sortCompare)
        currentUnit.attackUnitRanged(possibleTargets[0][1],this.board)
    }

    generateBitmap():Array<0|1>{
        let bitmap: Array<0|1> = new Array(this.board.width * this.board.height * 4)
        for(let i = 0; i < this.board.width * this.board.height; i++){
            let currentTile: Tile = this.board.getTileByIndex(i)
            bitmap[i*4] = currentTile.unitTeam == 1 ? 1 : 0
            bitmap[i*4+1] = currentTile.unitTeam == 2 ? 1 : 0
            bitmap[i*4+2] = currentTile.isObjective ? 1 : 0
            bitmap[i*4+3] = currentTile.blocksLOS ? 1 : 0
        }
        return bitmap
    }

    generateBitmap3D():Array<Array<0|1>>{
        let bitmap: Array<Array<0|1>> = new Array(this.board.width * this.board.height)
        for(let i = 0; i < this.board.width * this.board.height; i++){
            let currentTile: Tile = this.board.getTileByIndex(i)
            let vec = new Array(4)
            vec[0] = currentTile.unitTeam == 1 ? 1 : 0
            vec[1] = currentTile.unitTeam == 2 ? 1 : 0
            vec[2] = currentTile.isObjective ? 1 : 0
            vec[3] = currentTile.blocksLOS ? 1 : 0
            bitmap[i] = vec
        }
        return bitmap
    }

    generateBoardmap():Array<number>{
        let boardmap = new Array(this.board.width * this.board.height)
        for(let i = 0; i < this.board.width * this.board.height; i++){
            let currentTile: Tile = this.board.getTileByIndex(i)
            boardmap[i] = (currentTile.unitTeam == 1 ? 1 : 0) + (currentTile.unitTeam == 2 ? 2 : 0) + (currentTile.isObjective ? 4 : 0) + (currentTile.blocksLOS ? 8 : 0)
        }
        return boardmap
    }

    points(): number{
        //check every tile 3 inches away from each objective
        let objectives: Array<Tile> = this.board.tiles.flat().filter((value)=>value.isObjective)
        let ocArray: Array<number> = new Array(objectives.length).fill(0)
        //each unit within 3 inches of an objective add oc to it
        for(let unit of this.units){
            let distances: Array<number> = new Array(objectives.length).fill(0).map((_value, index) => Board.distance(unit.currentTile,objectives[index]))
            ocArray = ocArray.map((value, index) => distances[index] <= 3 ? value + unit.getOC() : value)
        }

        for(let unit of this.opponent.units){
            let distances: Array<number> = new Array(objectives.length).map((_value, index) => Board.distance(unit.currentTile,objectives[index]))
            ocArray = ocArray.map((value, index) => distances[index] <= 3 ? value - unit.getOC() : value)
        }
        let points = Math.min(ocArray.reduce((ac,value) => value > 0 ? ac + 5 : ac, 0),15)
        this.score += points
        //the player cant score more than 15 points in one turn from this mission
        return points
    }

    //we will assume an operative will always fight in melee if it can
    turn(){
        this.points()
        //console.log('Player ' + this.playerNum + " has scored " + this.points() + " points!")
        //generate the bitmap of the board for movement
        //let bitmap: Array<0|1> = this.generateBitmap()
        let boardmap: Array<number> = this.generateBoardmap()
        //move all units
        for(var unit of this.units){
            if(unit.dead){
                continue
            }
            this.movement(unit,boardmap)
        }
        
        //shoot with all units
        for(var unit of this.units){
             if(unit.dead){
                continue
            }
            this.decideShooting(unit)
        }
       
    }
}

function AiPlayerFromFile(fileName: string, board: Board, playerNum: 1|2, genome: Genome): Warhammer_AI_Player{
    //parse the units from the file
    let unitRoster: UnitWrapper[] = unitsFromFile(fileName,board,playerNum,playerNum);
    //create the player
    let player = new Warhammer_AI_Player(playerNum,board, genome)
    //add the units
    for(let unit of unitRoster){
        player.addUnit(unit)
    }
    return player
}


export {
    Warhammer_AI_Player,
    AiPlayerFromFile
}