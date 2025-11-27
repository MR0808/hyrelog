import { sha256 } from './hash';

export function computeEventHash(payload: unknown) {
    return sha256(JSON.stringify(payload));
}
