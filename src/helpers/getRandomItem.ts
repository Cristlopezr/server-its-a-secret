export function getRandomItem<T>(array: T[]): T | undefined {
    const randomIndex = Math.floor(Math.random() * array.length);
    return array[randomIndex];
}

/* export function getRandomUnusedIcon<T>(players:[],array: T[]): T | undefined {
    
    
} */
