import {UnitWrapper} from "./units.ts"
import {Tile, BoardObject, Terrain} from "./boardObject.ts"
import * as fs from "fs"

interface objective{
    x:number
    y:number
}

interface terrain{
    x:number
    y:number
    blocksMovement:boolean
    blocksLOS:boolean
}

interface BoardJSON{
    name:string,
    primary:string,
    rule:string,
    width:number,
    height:number,
    deployHeight:number,
    objectives:Array<objective>,
    terrain:Array<terrain>
}
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

    getTileByIndex(index:number):Tile{
        let x = index % this.width
        let y = (index - x) / this.width
        return this.tiles[y][x]
    }

    //https://en.wikipedia.org/wiki/Bresenham%27s_line_algorithm
    lineOfSight(startTile:Tile,targetTile:Tile):boolean{
        //if the points are oriented wrong, swap them.
        if(Math.abs(startTile.y-targetTile.y) < Math.abs(startTile.x-targetTile.x)){
            if(targetTile.x < startTile.x){
                //console.log(targetTile.x,targetTile.y)
                return this.lineOfSight(targetTile,startTile)
            }
            //let visited: Array<number[]> = []
            const dx:number = targetTile.x - startTile.x;
            let dy:number = targetTile.y - startTile.y;
            let yi = 1
            if(dy < 0){
                yi = -1
                dy = -dy
            }
            let D:number = 2 * dy - dx;
            let y:number = startTile.y;
            for(let x = startTile.x; x <= targetTile.x; x += 1){
                if(this.tiles[y][x].blocksLOS){
                    return false;
                }
                //visited.push([x,y])
                if(D > 0){
                    y = y + yi;
                    D = D + 2 * (dy - dx);
                }else{
                    D = D + 2 * dy;
                }
                
            };
            //console.log(visited)
            return true;
        }else{
            if(targetTile.y < startTile.y){
                //console.log(targetTile.x,targetTile.y)
                return this.lineOfSight(targetTile,startTile)
            }
            //let visited: Array<number[]> = []
            let dx:number = targetTile.x - startTile.x;
            const dy:number = targetTile.y - startTile.y;
            let xi = 1
            if(dx < 0){
                xi = -1
                dx = -1 * dx
            }
            let D:number = 2 * dx - dy;
            let x:number = startTile.x;
            for(let y = startTile.y; y <= targetTile.y; y += 1){
                if(this.tiles[y][x] == undefined){
                    console.log("oh no")
                }
                if(this.tiles[y][x].blocksLOS){
                    return false;
                }
                //visited.push([x,y])
                if(D > 0){
                    x = x + xi;
                    D = D + 2 * (dx - dy);
                }else{
                    D = D + 2 * dx;
                }
                
            };
            //console.log(visited)
            return true;
        }
    }

    static distance(tile1:Tile,tile2:Tile):number{
        return Math.sqrt( (tile1.x-tile2.x)**2 + (tile1.y-tile2.y)**2 )
    }

    getValidMoves(tile:Tile,movement:number):[number,number][]{
        var validMoves:[number,number][] = []
        for(let x = Math.max(0,tile.x - movement); x <Math.min(tile.x + movement,this.width-1); x++){
            for(let y = Math.max(0,tile.y - movement); y < Math.min(tile.y + movement,this.height-1); y++){
                //its only a valid move if it is within movement range and the tile is not occupied by a different unit
                let target: Tile = this.getTile(x,y)
                if(Math.sqrt((x-tile.x)**2 + (y-tile.y)**2) <= movement && (!target.hasUnit || (x == tile.x && y == tile.y))){
                    validMoves.push([x,y])
                }
            }
        }
        return validMoves;
    }

    static fromFile(filePath: string): Board{
        //open the file
        let file: string = fs.readFileSync(filePath,{ encoding: 'utf8', flag: 'r' });
        let board: BoardJSON = JSON.parse(file)
        //create a Board object
        let toReturn: Board = new Board(board.height,board.width)
        //place the objectives
        for(let objective of board.objectives){
            toReturn.getTile(objective.x,objective.y).isObjective = true
        }
        //place the terrain
        for(let terrain of board.terrain){
            let toModify:Tile = toReturn.getTile(terrain.x,terrain.y)
            toModify.blocksLOS = terrain.blocksLOS
        }
        return toReturn
    }

    //figure out how many points a player scores
    
};

//represents a object on the board


export {
    Board,
    Terrain,
    Tile,
    BoardObject
}