import {Tile,Board, BoardObject} from "./board.ts"
import * as diceUtil from "./dice.ts"

class Weapon{
    attacks:number = 0;
    ws:number = 7;
    damage:number = 0;
    strength:number = 0;
    keywords:string[] = [];
    range:number = 0;
    ap:number = 0;
    constructor(attacks:number,ws:number,damage:number,strength:number,keywords:string[],range:number,ap:number){
        this.attacks = attacks;
        this.ws = ws;
        this.damage = damage;
        this.strength = strength;
        this.keywords = keywords;
        this.range = range;
        this.ap = ap;
    }
    
    //TODO: implement keywords here. Use simulation work already done elsewhere, maybe move to unit or unit wrapper?
    attack(toughness:number):number{
        let results:number[] = diceUtil.multiD6(this.attacks);
        var hits:number = 0;
        for(let result of results){
            if(result >= this.ws){
                hits++;
            }
        }
        let woundResults:number[] = diceUtil.multiD6(hits);
        let output:number = 0;
        //determine what it takes to wound
        let toWound:number = 5;
        switch(true){
            case this.strength * 2 <= toughness:
                toWound = 6;
                break;
            case this.strength < toughness:
                toWound = 5;
                break;
            case this.strength == toughness:
                toWound = 4;
                break;
            case toughness < this.strength:
                toWound = 3;
                break;
            case toughness <= this.strength * 2:
                toWound = 2;
                break;
        }

        for(let result of woundResults){
            if(result >= toWound){
                output++;
            }
        }
        return output;
    }

}

class UnitWrapper extends BoardObject{
    units: Unit[] = []
    movement:number;
    largestRange:number;
    character: Unit;
    constructor(tile:Tile,name:string,units:Unit[]){
        super(tile,name);
        this.units = units;
        //set the movement of the blob to the slowest movement in the unit
        this.movement = Math.min(...this.units.map((value:Unit) => value.movement))
        //retrive the largest range in the unit
        this.largestRange = Math.min(...this.units.map((value:Unit) => value.rangedWeapon.range))
    }

    //make saving throws based on the incoming attacks
    savingThrows(wounds:number,ap:number):number{
        let results = diceUtil.multiD6(wounds);
        let successes = 0;
        for(let result of results){
            if(result - ap >= this.units[0].save){
                successes++;
            }
        }
        //reduce the number of regular attacks based on the save
        //attackDice[0] = Math.max(0,attackDice[0]-successes[0] - 2 * successes[1]);
        return Math.max(wounds-successes,0);
    }

    //TODO: rewrite for multiple models in a unit
    takeDamage(damageToTake:number):void{
        this.units[0].wounds -= damageToTake;
        if(this.units[0].wounds <= 0){
            if(this.units.length == 1){
                this.remove();
                return;
            }
            //pull the unit from the back of the list to the front
            this.units[0] = this.units[this.units.length - 1];
            this.units.pop();
        }

    }

    attackUnitRanged(unitToAttack:UnitWrapper,board:Board):void{
        //check if line of sight is ok
        var lineOfSight = board.lineOfSight(this.currentTile,unitToAttack.currentTile);
        if(!lineOfSight){
            return;
        }
        //TODO: redo this sequence for multiple attacking models and weapons of different stats
        //for now iterate over each unit and attack with each of its weapons. redo later into batches when human dice rolling is involved
        for(var unit of this.units){
            var wounds = unit.rangedWeapon.attack(unitToAttack.units[0].toughness);

            var succesfulWounds = unitToAttack.savingThrows(wounds,unit.rangedWeapon.ap);
    
            for(var i = 0; i < succesfulWounds; i++){
                unitToAttack.takeDamage(unit.rangedWeapon.damage);
            }
        }
    }

    getType():string{return "Unit"}
}

//40K unit
//keep array of models for wound allocation and weapon tracking
//optional character property
class Unit{
    //TODO: rewrite properties for a 40k units
    movement:number;
    toughness:number;
    save:number;
    wounds:number;
    rangedWeapon:Weapon;
    meleeWeapon:Weapon;
    constructor(movement:number,toughness:number,save:number,wounds:number,rangedWeapon:Weapon,meleeWeapon:Weapon){
        this.movement = movement;
        this.save = save;
        this.wounds = wounds;
        this.rangedWeapon = rangedWeapon;
        this.meleeWeapon = meleeWeapon;
        this.toughness = toughness;
    }

    clone():Unit{
        return structuredClone(this);
        //return new this(this.movement,this.toughness,this.save,this.wounds.this.rangedWeapon,this.meleeWeapon)
    }
}

export {
    Weapon,
    UnitWrapper,
    Unit
}