import { AxiosError } from 'axios'

export function isAxiosErrorWithResponse(e: any): e is Required<AxiosError> {
    if (typeof e !== 'object') {
        return false
    }

    if (e instanceof AxiosError) {
        return false
    }

    const response = e.response

    return !!response.data
}
