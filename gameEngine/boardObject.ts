//represents a single tile in the board. holds information about that tile. Each tile represents a 1 inch x 1 inch square on a in person board
class Tile{
    x: number = -1;
    y: number = -1;
    blocksLOS:boolean = false;
    hasUnit = false;
    boardObjects:BoardObject[] = Array();
    constructor(x:number,y:number){
        this.x = x;
        this.y = y;
    }
    //remove the BoardObject that has the name "objectName"
    //returns true if something was removed, returns false if nothing was found
    removeObject(objectName:string): boolean{
        for(var i = 0; i < this.boardObjects.length;i++){
            if(this.boardObjects[i].name == objectName){
                this.boardObjects.splice(i,1);
                return true;
            }
        }
        return false;
    }

};

class BoardObject{
    name: string = "";
    currentTile: Tile;
    constructor(tile:Tile,name:string){
        this.name = name;
        this.currentTile = tile;
        tile.boardObjects.push(this);
    }
    //move this object to the given tile
    move(dTile:Tile): void{
        dTile.boardObjects.push(this);
        if(this.currentTile != null){
            this.currentTile.removeObject(this.name);
        }
        this.currentTile = dTile;
    }
    //remove this object from the board
    remove(): void{
        if(this.currentTile != null){
            this.currentTile.removeObject(this.name);
        }
        //delete this;
    }

    getType():string{return "BoardObject"}
}

//can block line of sight, block movement, or both
class Terrain extends BoardObject{
    blocksMovement:boolean = false;
    blocksLOS:boolean = false;
    constructor(tile:Tile,name:string,blocksMovement:boolean,blocksLOS:boolean){
        super(tile,name);
        this.blocksMovement = blocksMovement;
        this.blocksLOS = blocksLOS;
        tile.blocksLOS = blocksLOS;
    }

    getType():string{return "Terrain"}
}

export {Tile,BoardObject,Terrain}