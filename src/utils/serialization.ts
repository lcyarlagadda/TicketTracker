// utils/serialization.ts
import { Timestamp } from 'firebase/firestore';

/**
 * Converts Firebase Timestamp to a serializable ISO string
 */
export const serializeTimestamp = (timestamp: any): string => {
  if (!timestamp) return '';
  
  // If it's already a Firebase Timestamp
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toISOString();
  }
  
  // If it's already a Date object
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  
  // If it's already a string, return as is
  if (typeof timestamp === 'string') {
    return timestamp;
  }
  
  // If it's a number (milliseconds), convert to Date then ISO string
  if (typeof timestamp === 'number') {
    return new Date(timestamp).toISOString();
  }
  
  return '';
};

/**
 * Converts a serialized ISO string back to a Date object
 */
export const deserializeTimestamp = (isoString: string): Date => {
  if (!isoString) return new Date();
  return new Date(isoString);
};

/**
 * Recursively serializes all Timestamps in an object
 */
export const serializeFirebaseData = (data: any): any => {
  if (!data) return data;
  
  if (Array.isArray(data)) {
    return data.map(serializeFirebaseData);
  }
  
  if (typeof data === 'object') {
    const serialized: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (key === 'createdAt' || key === 'updatedAt' || key === 'timestamp') {
        serialized[key] = serializeTimestamp(value);
      } else {
        serialized[key] = serializeFirebaseData(value);
      }
    }
    return serialized;
  }
  
  return data;
};

/**
 * Recursively deserializes ISO strings back to Date objects where needed
 */
export const deserializeFirebaseData = (data: any): any => {
  if (!data) return data;
  
  if (Array.isArray(data)) {
    return data.map(deserializeFirebaseData);
  }
  
  if (typeof data === 'object') {
    const deserialized: any = {};
    for (const [key, value] of Object.entries(data)) {
      if ((key === 'createdAt' || key === 'updatedAt' || key === 'timestamp') && typeof value === 'string') {
        deserialized[key] = deserializeTimestamp(value);
      } else {
        deserialized[key] = deserializeFirebaseData(value);
      }
    }
    return deserialized;
  }
  
  return data;
};
