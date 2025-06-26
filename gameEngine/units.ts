import { range } from "express/lib/request.js"
import {Tile,Board, BoardObject} from "./board.ts"
import * as diceUtil from "./dice.ts"
import * as fs from "fs"

export interface WeaponData{
    a: number | string
    range: number | undefined
    bs: number | undefined
    s:number
    ap:number
    d:number | string
    keywords:string[]
}

export interface ModelData{
    m:number
    t:number
    sv:number
    w:number
    ld:number
    oc:number
    inv_sv:number | undefined
    rangedWeapons: string[]
    meleeWeapons: string[]
}

export interface UnitData{
    models: string[]
    startPos:[number,number]
}
export interface CombatPatrol{
    weapons: Map<string,WeaponData>
    models: Map<string,ModelData>
    units: Map<string,UnitData>
}
export class Weapon{
    attacks:number|diceUtil.Dice = 0;
    ws:number = 7;
    damage:number|diceUtil.Dice = 0;
    strength:number = 0;
    keywords:string[] = [];
    range:number = 0;
    ap:number = 0;
    constructor(attacks:number|string,ws:number,damage:number|string,strength:number,keywords:string[],range:number,ap:number){
        //accept either a string containing a valid dice string or just a flat number of attacks
        if(typeof attacks == "string"){
            this.attacks = new diceUtil.Dice(attacks);
        }else{
             this.attacks = attacks;
        }
        this.ws = ws;
        if(typeof damage == "string"){
            this.damage = new diceUtil.Dice(damage);
        }else{
             this.damage = damage;
        }
        this.strength = strength;
        this.keywords = keywords;
        this.range = range;
        this.ap = ap;
    }
    
    //TODO: implement keywords here. Use simulation work already done elsewhere, maybe move to unit or unit wrapper?
    attack(toughness:number):number{
        let results:number[] = typeof this.attacks == "number" ? diceUtil.multiD6(this.attacks) : this.attacks.roll();
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

export class UnitWrapper extends BoardObject{
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
        this.largestRange = Math.max(...this.units.map((value:Unit) => Math.max(...value.rangedWeapons.map((value:Weapon) => value.range))))
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
            for(let weapon of unit.rangedWeapons){
                let wounds = weapon.attack(unitToAttack.units[0].toughness);

                let succesfulWounds = unitToAttack.savingThrows(wounds,weapon.ap);
        
                for(let i = 0; i < succesfulWounds; i++){
                    //if the damage is random, roll to see how much damage will be dealt
                    if(weapon.damage instanceof diceUtil.Dice){
                        unitToAttack.takeDamage(weapon.damage.rollSum());
                    }else{
                        unitToAttack.takeDamage(weapon.damage);
                    }
                    
                }
            }
            
        }
    }

    getType():string{return "Unit"}
}

//40K unit
//keep array of models for wound allocation and weapon tracking
//optional character property
export class Unit{
    //TODO: rewrite properties for a 40k units
    movement:number;
    toughness:number;
    save:number;
    wounds:number;
    rangedWeapons:Weapon[];
    meleeWeapons:Weapon[];
    constructor(movement:number,toughness:number,save:number,wounds:number,rangedWeapons:Weapon[],meleeWeapons:Weapon[]){
        this.movement = movement;
        this.save = save;
        this.wounds = wounds;
        this.rangedWeapons = rangedWeapons;
        this.meleeWeapons = meleeWeapons;
        this.toughness = toughness;
    }

    clone():Unit{
        return structuredClone(this);
        //return new this(this.movement,this.toughness,this.save,this.wounds.this.rangedWeapon,this.meleeWeapon)
    }
}

function jsonToCombatPatrol(json: Object): CombatPatrol{
    return {
        units: new Map(Object.entries(json["units"])),
        models: new Map(Object.entries(json["models"])),
        weapons: new Map(Object.entries(json["weapons"]))
    }
}

export function unitsFromFile(filePath:string, board:Board) : UnitWrapper[]{
    //create an array of units to return
    let units : UnitWrapper[] = []
    //read in the JSON file and parse it
    let file: string = fs.readFileSync(filePath,{ encoding: 'utf8', flag: 'r' });
    let unitJSONRaw: Object = JSON.parse(file);
    let unitJSON: CombatPatrol = jsonToCombatPatrol(unitJSONRaw);
    //iterate over each unit
    unitJSON.units.forEach((value: UnitData, key:string)=>{
        let models: Unit[] = []
        for(let model of value.models){
            //get the data for that model
            let data: ModelData = unitJSON.models.get(model) as ModelData
            //get the data for each weapon
            let rangedWeapons: Weapon[] = []
            let meleeWeapons: Weapon[] = []
            //parse melee weapons
            for(let weapon of data.meleeWeapons){
                let weaponData: WeaponData = unitJSON.weapons.get(weapon) as WeaponData
                if(typeof weaponData.bs == "undefined"){
                    //handle torrent weapons here
                    continue
                }
                meleeWeapons.push(new Weapon(weaponData.a,weaponData.bs,weaponData.d,weaponData.s,weaponData.keywords,-1,weaponData.ap));
            }
            //parse ranged weapons
            for(let weapon of data.rangedWeapons){
                let weaponData: WeaponData = unitJSON.weapons.get(weapon) as WeaponData
                if(typeof weaponData.bs == "undefined"){
                    //handle torrent weapons here
                    continue
                }
                rangedWeapons.push(new Weapon(weaponData.a,weaponData.bs,weaponData.d,weaponData.s,weaponData.keywords,weaponData.range as number,weaponData.ap))
            }
            //create a new Unit object and push it to the array of Unit objects
            models.push(new Unit(data.m,data.t,data.sv,data.w,rangedWeapons,meleeWeapons))
        }
        //create a UnitWrapper and push it to the array of parsed units
        units.push(new UnitWrapper(board.getTile(value.startPos[0],value.startPos[1]),key,models))
    })

    return units;
}
