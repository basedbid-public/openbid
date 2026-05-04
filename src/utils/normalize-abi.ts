import { AbiInput } from 'interfaces/abi-input';

export const normalizeByAbi = (
  value: unknown,
  input: AbiInput,
  path: string,
): unknown => {
  if (input.type.endsWith('[]')) {
    const itemInput: AbiInput = {
      ...input,
      type: input.type.slice(0, -2),
    };

    if (itemInput.type === 'tuple') {
      // API can return a single tuple instead of tuple[]; normalize to array.
      if (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value)
      ) {
        return [normalizeByAbi(value, itemInput, `${path}[0]`)];
      }

      if (Array.isArray(value)) {
        const first: unknown = value[0];
        const looksLikeArrayOfTuples =
          value.length === 0 ||
          Array.isArray(first) ||
          (first !== null && typeof first === 'object');

        const tupleItems = looksLikeArrayOfTuples ? value : [value];
        return tupleItems.map((item, index) =>
          normalizeByAbi(item, itemInput, `${path}[${index}]`),
        );
      }
    }

    if (!Array.isArray(value)) {
      throw new Error(`Expected array at ${path}, got ${typeof value}`);
    }

    return value.map((item, index) =>
      normalizeByAbi(item, itemInput, `${path}[${index}]`),
    );
  }

  if (input.type === 'tuple') {
    const components = input.components ?? [];

    if (Array.isArray(value)) {
      return components.map((component, index) =>
        normalizeByAbi(value[index], component, `${path}[${index}]`),
      );
    }

    if (value !== null && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      return components.map((component, index) => {
        const key = component.name ?? `${index}`;
        return normalizeByAbi(record[key], component, `${path}.${key}`);
      });
    }

    throw new Error(`Expected tuple at ${path}, got ${typeof value}`);
  }

  if (value === undefined) {
    throw new Error(`Missing required ABI value at ${path} (${input.type})`);
  }

  return value;
};
