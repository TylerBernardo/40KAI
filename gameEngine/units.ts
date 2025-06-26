import { range } from "express/lib/request.js"
import {Tile,Board, BoardObject} from "./board.ts"
import * as diceUtil from "./dice.ts"
import { simulate } from "../stats/simulate.ts"
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
    attack(toughness:number,save:number):number[]{
        let attacks:number = typeof this.attacks == "number" ? this.attacks : this.attacks.rollSum();
        return simulate(this.ws,attacks,this.strength,this.ap,this.damage,save,toughness,this.keywords)
    }

    identical(toCompare: Weapon): boolean{
        //check if the damage values are the same
        if(this.damage instanceof diceUtil.Dice && toCompare.damage instanceof diceUtil.Dice){
            if(this.damage.diceString != toCompare.damage.diceString){
                return false
            }
        }else if(typeof this.damage == "number" && typeof toCompare.damage == "number"){
            if (this.attacks != toCompare.attacks){
                return false
            }
        }else{
            return false
        }
        //check other properties that can only be one type
        return  this.ap == toCompare.ap &&
                this.keywords == toCompare.keywords &&
                this.strength == toCompare.strength &&
                this.ws == toCompare.ws

    }

    clone(): Weapon{
        return structuredClone(this);
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

    //create weapons clustered by profile for rolling efficency
    getRangedWeapons(range:number): Weapon[]{
        var weapons: Weapon[] = []
        //iterate over each model
        for(let model of this.units){
            //iterate over each model's weapons
            for(let weapon of model.rangedWeapons){
                //check if the weapon is within range
                if(weapon.range > range){
                    continue
                }
                //check if the weapons array already contains something identical
                let match: boolean = false;
                for(let weaponC of weapons){
                    if(weapon.identical(weaponC)){
                        //add this weapon's attacks to the one in weapons
                        if(typeof weaponC.attacks == "number"){
                            if(typeof weapon.attacks == "number"){
                                weaponC.attacks += weapon.attacks
                            }else{
                                weaponC.attacks = new diceUtil.Dice(weaponC.attacks.toString())
                                weaponC.attacks.add(weapon.attacks)
                            }
                            
                        }else{
                            weaponC.attacks.add(weapon.attacks)
                        }
                        match = true;
                        break;
                    }
                }
                if(match){
                    continue
                }
                //if there wasnt a match add a copy of this weapon to the weapons list
                weapons.push(weapon.clone())
            }
        }

        return weapons;
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
        //calculate how far away the two units are
        let distance: number = board.distance(this.currentTile,unitToAttack.currentTile);
        //check if line of sight is ok
        var lineOfSight = board.lineOfSight(this.currentTile,unitToAttack.currentTile);
        if(!lineOfSight){
            return;
        }
        //TODO: redo this sequence for multiple attacking models and weapons of different stats
        //for now iterate over each unit and attack with each of its weapons. redo later into batches when human dice rolling is involved
        for(var unit of this.units){
            for(let weapon of unit.rangedWeapons){
                //skip the weapon if it is out of range
                if(weapon.range < distance){
                    continue
                }
                //calculate how much damage this weapon will deal
                let damageList: number[] = weapon.attack(unitToAttack.units[0].toughness, unitToAttack.units[0].toughness);
                //apply the damage one wound at a time
                for(let damage of damageList){
                    unitToAttack.takeDamage(damage);
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
    name:string;
    constructor(movement:number,toughness:number,save:number,wounds:number,rangedWeapons:Weapon[],meleeWeapons:Weapon[], name:string){
        this.movement = movement;
        this.save = save;
        this.wounds = wounds;
        this.rangedWeapons = rangedWeapons;
        this.meleeWeapons = meleeWeapons;
        this.toughness = toughness;
        this.name = name;
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
            models.push(new Unit(data.m,data.t,data.sv,data.w,rangedWeapons,meleeWeapons,model))
        }
        //create a UnitWrapper and push it to the array of parsed units
        units.push(new UnitWrapper(board.getTile(value.startPos[0],value.startPos[1]),key,models))
    })

    return units;
}
