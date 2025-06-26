import {Board,BoardObject,Tile,Terrain} from "./board.ts"
import * as diceUtils from "./dice.ts"
import { Unit, UnitWrapper, Weapon } from "./units.ts"
import {dgpbinom} from "../stats/gpbd.ts"
import { weaponObjectToGPBD } from "../stats/warhammer.ts"

class WarhammerPlayer{
    playerNum:number = 0;
    board:Board;
    units:UnitWrapper[] = []
    opponent:WarhammerPlayer;
    constructor(_playerNum:number,board:Board){
        this.playerNum = _playerNum;
        this.board = board;
    }

    setOpponent(newOpponent:WarhammerPlayer):void{
        this.opponent = newOpponent;
    }

    addUnit(toAdd:UnitWrapper):void{
        this.units.push(toAdd);
    }


    //each class that implements WarhammerPlayer should implement these functions
    movement(currentUnit:UnitWrapper){}
    decideShooting(currentUnit:UnitWrapper){}
    turn(){}
    //TODO: Add charging
}

class Warhammer_AI_Player extends WarhammerPlayer{
    constructor(playerNum:number,board:Board){
        super(playerNum,board)
    }

    sortCompare(a:[number,any],b:[number,any]):number{
        if(a[0] < b[0]){
            return -1
        }
        if(a[0] > b[0]){
            return 1;
        }
        return 0;
    }

    evaluateMove(currentUnit:UnitWrapper,moveCords:[number,number]):number{
        let currentDistanceToEnemies:number = 0;
        let newDistanceToEnemies:number = 0;
        for(let enemy of this.opponent.units){
            currentDistanceToEnemies += this.board.distance(enemy.currentTile,currentUnit.currentTile)
            newDistanceToEnemies += this.board.distance(enemy.currentTile,this.board.getTile(moveCords[0],moveCords[1]))
        }
        //TODO: Use neural network here
        //TODO: Check if move puts you in engagement range of an enemy operative
        //let inputs = [currentDistanceToEnemies,newDistanceToEnemies,this.board.distance(currentUnit.currentTile,this.board.getTile(moveCords[0],moveCords[1])),currentUnit.save,currentUnit.defense,currentUnit.wounds,currentUnit.rangedWeapon.range]
        //for now choose a random probability for this move
        return Math.random();
    }
    
    //score how good a certain shot is
    evaluateShot(attacker:UnitWrapper,target:UnitWrapper):number{
        let score: number = 0
        let distance: number = this.board.distance(attacker.currentTile,target.currentTile);
        //get all the weapons combined into bigger profiles
        let weapons: Weapon[] = attacker.getRangedWeapons(distance);
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
        let average: number = -1, mostLikely: number = -1;
        for(let i = 0; i < distribution.length; i++){
            let p = distribution[i]
            probLeft -= p;
            if(mostLikely == -1 && probLeft < .95){
                mostLikely = i
            }
            if(average == -1 && probLeft < .5){
                average = i
                break;
            }
        }
        score += average + mostLikely * 3
        return score;
    }

    movement(currentUnit:UnitWrapper):void{
        let possibleMoves = this.board.getValidMoves(currentUnit.currentTile,currentUnit.movement);
        //select move at random currently. This will eventually be done with the ai
        let evalMoves:Array<[number,[number,number]]> = Array<[number,[number,number]]>(possibleMoves.length);
        for(var i = 0; i < possibleMoves.length; i++){
            evalMoves[i] = [this.evaluateMove(currentUnit,possibleMoves[i]),possibleMoves[i]]
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
            if(this.board.distance(currentUnit.currentTile,target.currentTile) <= currentUnit.largestRange){
                possibleTargets.push([this.evaluateShot(currentUnit,target),target])
            }
        }
        if(possibleTargets.length == 0){
            return
        }
        //choose which shot to take
        possibleTargets.sort(this.sortCompare)
        for(let pTarget of possibleTargets){
            if(Math.random() <= pTarget[0]){
                currentUnit.attackUnitRanged(pTarget[1],this.board);
                return
            }
        }
    }
    //we will assume an operative will always fight in melee if it can
    turn(){
        //move all units
        for(var unit of this.units){
            this.movement(unit)
        }
        //shoot with all units
        for(var unit of this.units){
            //this.decideShooting(unit)
        }
       
    }
}


export {
    Warhammer_AI_Player
}