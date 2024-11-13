export function getRandomItem<T>(array: T[]): T | undefined {
    const randomIndex = Math.floor(Math.random() * array.length);
    return array[randomIndex];
}

export function getRandomUnusedItem(itemsInUse: string[], allItems: string[]): string {
    const unusedItems = allItems.filter(item => !itemsInUse.includes(item));

    if (unusedItems.length === 0) {
        return allItems[0]!;
    }

    let randomIndex = Math.floor(Math.random() * unusedItems.length);
    return unusedItems[randomIndex] ? unusedItems[randomIndex] : allItems[0]!;
}
