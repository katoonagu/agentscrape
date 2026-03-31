import path from "node:path";
import fs from "fs-extra";

export async function readJsonFile<T>(filePath: string): Promise<T> {
  return (await fs.readJson(filePath)) as T;
}

export async function readTextFile(filePath: string): Promise<string> {
  return fs.readFile(filePath, "utf8");
}

export async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function ensureDirectory(dirPath: string): Promise<void> {
  await fs.ensureDir(dirPath);
}

export async function pathExists(targetPath: string): Promise<boolean> {
  return fs.pathExists(targetPath);
}
