export type FoodCatalogItem = {
  name: string;
  portion: string;
  category: string;
  nutrients: Record<string, number>;
};

export const defaultFoodCatalog: FoodCatalogItem[] = [
  {
    name: 'Banana',
    portion: '1 medium',
    category: 'Fruit',
    nutrients: { calories: 105, protein: 1.3, carbs: 27, fat: 0.3, fiber: 3.1, sugar: 14.4, sodium: 1, vitamin_a: 54, vitamin_c: 10.3, vitamin_d: 0, vitamin_e: 0.1, vitamin_k: 0.5, calcium: 6, iron: 0.3, magnesium: 32, zinc: 0.2, potassium: 422, vitamin_b12: 0, folate: 23.6 },
  },
  {
    name: 'Apple',
    portion: '1 medium',
    category: 'Fruit',
    nutrients: { calories: 95, protein: 0.5, carbs: 25, fat: 0.3, fiber: 4.4, sugar: 19, sodium: 2, vitamin_a: 3, vitamin_c: 8.4, vitamin_d: 0, vitamin_e: 0.2, vitamin_k: 4.4, calcium: 10, iron: 0.1, magnesium: 5, zinc: 0.1, potassium: 195, vitamin_b12: 0, folate: 5 },
  },
  {
    name: '100g Beef',
    portion: '100 g cooked',
    category: 'Protein',
    nutrients: { calories: 250, protein: 26, carbs: 0, fat: 15, fiber: 0, sugar: 0, sodium: 75, vitamin_a: 0, vitamin_c: 0, vitamin_d: 0.1, vitamin_e: 0.4, vitamin_k: 1.7, calcium: 18, iron: 2.6, magnesium: 24, zinc: 6, potassium: 320, vitamin_b12: 2.7, folate: 11 },
  },
  {
    name: 'Chicken Breast',
    portion: '150 g cooked',
    category: 'Protein',
    nutrients: { calories: 280, protein: 53, carbs: 0, fat: 6, fiber: 0, sugar: 0, sodium: 110, vitamin_a: 26, vitamin_c: 0, vitamin_d: 0.2, vitamin_e: 0.3, vitamin_k: 0.1, calcium: 17, iron: 1.1, magnesium: 48, zinc: 1.1, potassium: 430, vitamin_b12: 0.3, folate: 6 },
  },
  {
    name: 'Salmon',
    portion: '120 g',
    category: 'Protein',
    nutrients: { calories: 206, protein: 25, carbs: 0, fat: 11, fiber: 0, sugar: 0, sodium: 59, vitamin_a: 40, vitamin_c: 3.9, vitamin_d: 19, vitamin_e: 1.3, vitamin_k: 0.7, calcium: 13, iron: 0.8, magnesium: 31, zinc: 0.7, potassium: 390, vitamin_b12: 5.7, folate: 21 },
  },
  {
    name: 'Greek Yogurt',
    portion: '200 g',
    category: 'Dairy',
    nutrients: { calories: 150, protein: 20, carbs: 6, fat: 0, fiber: 0, sugar: 6, sodium: 60, vitamin_a: 6, vitamin_c: 0, vitamin_d: 0.5, vitamin_e: 0.1, vitamin_k: 0.2, calcium: 200, iron: 0.1, magnesium: 16, zinc: 0.8, potassium: 240, vitamin_b12: 0.8, folate: 19 },
  },
  {
    name: 'Spinach',
    portion: '1 cup cooked',
    category: 'Vegetable',
    nutrients: { calories: 41, protein: 5.4, carbs: 3.6, fat: 0.5, fiber: 4.3, sugar: 0.4, sodium: 126, vitamin_a: 943, vitamin_c: 17.6, vitamin_d: 0, vitamin_e: 2.2, vitamin_k: 888, calcium: 245, iron: 2.7, magnesium: 157, zinc: 0.8, potassium: 839, vitamin_b12: 0, folate: 263 },
  },
  {
    name: 'Oats',
    portion: '80 g dry',
    category: 'Grain',
    nutrients: { calories: 300, protein: 10, carbs: 54, fat: 5.5, fiber: 8, sugar: 1, sodium: 0, vitamin_a: 0, vitamin_c: 0, vitamin_d: 0, vitamin_e: 0.7, vitamin_k: 0.2, calcium: 52, iron: 1.7, magnesium: 100, zinc: 2.4, potassium: 340, vitamin_b12: 0, folate: 28 },
  },
  {
    name: 'Eggs',
    portion: '2 large',
    category: 'Protein',
    nutrients: { calories: 140, protein: 12, carbs: 1, fat: 10, fiber: 0, sugar: 1, sodium: 140, vitamin_a: 140, vitamin_c: 0, vitamin_d: 41, vitamin_e: 1, vitamin_k: 30, calcium: 50, iron: 1.2, magnesium: 12, zinc: 1.2, potassium: 126, vitamin_b12: 0.9, folate: 24 },
  },
  {
    name: 'Brown Rice',
    portion: '1 cup cooked',
    category: 'Grain',
    nutrients: { calories: 216, protein: 5, carbs: 45, fat: 1.8, fiber: 3.5, sugar: 0.4, sodium: 10, vitamin_a: 0, vitamin_c: 0, vitamin_d: 0, vitamin_e: 0.2, vitamin_k: 0.6, calcium: 20, iron: 0.8, magnesium: 84, zinc: 1.1, potassium: 150, vitamin_b12: 0, folate: 7 },
  },
  {
    name: 'Avocado',
    portion: '1 whole',
    category: 'Fruit',
    nutrients: { calories: 240, protein: 3, carbs: 12, fat: 22, fiber: 10, sugar: 1, sodium: 12, vitamin_a: 10, vitamin_c: 16, vitamin_d: 0, vitamin_e: 3.4, vitamin_k: 31, calcium: 18, iron: 0.8, magnesium: 39, zinc: 0.7, potassium: 689, vitamin_b12: 0, folate: 110 },
  },
  {
    name: 'Lentils',
    portion: '1 cup cooked',
    category: 'Legume',
    nutrients: { calories: 230, protein: 18, carbs: 40, fat: 0.8, fiber: 16, sugar: 3.5, sodium: 4, vitamin_a: 11, vitamin_c: 4.8, vitamin_d: 0, vitamin_e: 0.2, vitamin_k: 3.5, calcium: 38, iron: 6.6, magnesium: 71, zinc: 2.5, potassium: 731, vitamin_b12: 0, folate: 358 },
  },
  {
    name: 'Orange',
    portion: '1 medium',
    category: 'Fruit',
    nutrients: { calories: 62, protein: 1.2, carbs: 15.4, fat: 0.2, fiber: 3.1, sugar: 12.2, sodium: 0, vitamin_a: 20, vitamin_c: 70, vitamin_d: 0, vitamin_e: 0.2, vitamin_k: 0.1, calcium: 52, iron: 0.1, magnesium: 13, zinc: 0.1, potassium: 237, vitamin_b12: 0, folate: 30 },
  },
];
