import {UnitWrapper} from "./units.ts"

//represents a single tile in the board. holds information about that tile. Each tile represents a 1 inch x 1 inch square on a in person board
class Tile{
    x: number = -1;
    y: number = -1;
    blocksLOS:boolean = false;
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

    toString(): string{
        let output: string = "";
        //console.log(this.boardObjects)
        for(let object of this.boardObjects){
            output += object.name;
            if(object instanceof UnitWrapper){
                let castedUnit: UnitWrapper = object;
                //TODO: print more useful info here
                output += "(" + castedUnit.name + ")"
            }
        }
        return output;
    }
    
        /*
        //target tile should always be greater than the 
        if(targetTile.x < this.x || targetTile.y < this.y){
            return targetTile.lineOfSight(this);
        }
            */

};

//represents the game board. Keeps track of unit positions, tiles on the board, and other things.
class Board{
    height:number = 0;
    width:number = 0;
    tiles:Tile[][] = [];
    constructor(height:number,width:number){
        this.height = height;
        this.width = width;
        this.tiles = Array(height);
        //create array of tiles
        for(let r = 0; r < height; r++){
            this.tiles[r] = Array(width);
            for(let c = 0; c < width; c++){
                this.tiles[r][c] = new Tile(c,r);
            }
        }
    }

    printBoard():string{
        let output:string = "";
        for(let r = 0; r < this.height; r++){
            for(let c = 0; c < this.width; c++){
                output += "[ " + this.tiles[r][c].toString() + "] "
            }
            output += '\n';
        }
        return output;
    }

    printBoardFormatted():string{
        let output:string = "<table>";
        for(let r = 0; r < this.height; r++){
            output += "<tr>"
            for(let c = 0; c < this.width; c++){
                output += "<td>a" + this.tiles[r][c].toString() + "</td>"
            }
            output += '</tr>';
        }
        return output + "</table>";
    }

    getTile(x:number,y:number):Tile{
        return this.tiles[y][x]
    }

    //https://en.wikipedia.org/wiki/Bresenham%27s_line_algorithm
    lineOfSight(startTile:Tile,targetTile:Tile):boolean{
        //if the points are oriented wrong, swap them.
        if(targetTile.x < startTile.x){
            //console.log(targetTile.x,targetTile.y)
            return this.lineOfSight(targetTile,startTile)
        }
        const dx:number = targetTile.x - startTile.x;
        const dy:number = targetTile.y - startTile.y;
        let D:number = 2 * dy - dx;
        let y:number = startTile.y;
        for(let x = startTile.x; x <= targetTile.x; x += 1){
            if(this.tiles[y][x].blocksLOS){
                return false;
            }
            if(D > 0){
                y = y + 1;
                D = D - 2 * dx;
            }
            D = D + 2 * dy;
        };
        return true;
    }

    distance(tile1:Tile,tile2:Tile):number{
        return Math.sqrt( (tile1.x-tile2.x)^2 + (tile1.y-tile2.y)^2 )
    }

    getValidMoves(tile:Tile,movement:number):[number,number][]{
        var validMoves:[number,number][] = []
        for(let x = Math.max(0,tile.x - movement); x <Math.min(tile.x + movement,this.width); x++){
            for(let y = Math.max(0,tile.y - movement); y < Math.min(tile.y + movement,this.height); y++){
                if(Math.sqrt(x^2 + y^2) <= movement){
                    validMoves.push([x,y])
                }
            }
        }
        return validMoves;
    }
};

//represents a object on the board
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

export {
    Tile,
    Board,
    BoardObject,
    Terrain
}