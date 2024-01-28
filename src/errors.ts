import { AxiosError } from 'axios'
import { Ref, ref } from 'vue'
import { isAxiosErrorWithResponse } from './axios.ts'

export type Error = {
    message: string
    path?: string
}

export type ErrorResponse = {
    success: boolean
    code: string
    errors: Error[]
}

export type ValidationErrorResponse = Omit<ErrorResponse, 'code'> & {
    code: 'ERROR_DATA_VALIDATION'
}

type ErrorKey = string | number
type ErrorKeyOrKeys = ErrorKey | ErrorKey[]

export interface ErrorCollection {
    addError(keys: ErrorKey[], e: Error): void

    children(path: ErrorKeyOrKeys): ErrorCollection
    get(path: ErrorKeyOrKeys): Error[] | undefined
    has(path: ErrorKeyOrKeys): boolean
    last(path: ErrorKeyOrKeys): string | undefined

    merge(withCollection: ErrorCollection): ErrorCollection

    readonly all: Error[]
}

export function isUnauthorized(e: AxiosError<ErrorResponse>): boolean {
    return !!e.response && 'ERROR_UNAUTHORIZED' === e.response.data.code
}

export function isValidationError(
    e: AxiosError<any>,
): e is Required<AxiosError<ValidationErrorResponse>> {
    if (isServerError(e)) {
        return isValidationErrorResponse(e.response.data)
    }

    return false
}

export function isValidationErrorResponse(
    r: ErrorResponse,
): r is ValidationErrorResponse {
    return 'ERROR_DATA_VALIDATION' === r.code
}

export function isServerError(
    e: any,
): e is Required<AxiosError<ErrorResponse>> {
    if (!isAxiosErrorWithResponse(e)) {
        return false
    }

    const data = e.response.data

    if (typeof data !== 'object') {
        return false
    }

    if (null === data) {
        return false
    }

    return 'success' in data && 'code' in data && 'errors' in data
}

export function processError(
    error: Required<AxiosError<ErrorResponse>>,
): ErrorCollection {
    const response = error.response

    if (!response || response.data.code !== 'ERROR_VALIDATION') {
        return createErrorCollection([])
    }

    const errors: Error[] = response.data.errors

    if (!errors) {
        return createErrorCollection([])
    }

    return createErrorCollection(errors)
}

const emptyErrors: ErrorCollection = {
    addError() {
        //
    },
    has(): boolean {
        return false
    },
    children(): ErrorCollection {
        return emptyErrors
    },
    get(): Error[] | undefined {
        return undefined
    },
    last(): string | undefined {
        return undefined
    },
    merge(): ErrorCollection {
        return emptyErrors
    },
    get all(): Error[] {
        return []
    },
}

function getKeys(path: ErrorKeyOrKeys): ErrorKey[] {
    if (Array.isArray(path)) {
        return path
    }

    return String(path).split('.')
}

export function createErrorCollection(backendErrors: Error[]): ErrorCollection {
    const errors: Ref<Record<string | number, Error[]>> = ref({})
    const children: Ref<Record<string | number, ErrorCollection>> = ref({})

    const collection: ErrorCollection = {
        addError: (keys: ErrorKey[], e: Error): void => {
            const key = keys.shift() ?? ''

            if (keys.length) {
                let currentChildren = children.value[key]

                if (!currentChildren) {
                    currentChildren = createErrorCollection([])
                    children.value[key] = currentChildren
                }

                return currentChildren.addError(keys, e)
            }

            if (!errors.value[key]) {
                errors.value[key] = []
            }

            errors.value[key]?.push(e)
        },
        children(path: ErrorKeyOrKeys): ErrorCollection {
            const keys = getKeys(path)

            const key = keys.shift()

            if (typeof key === 'undefined') {
                return emptyErrors
            }

            const val: ErrorCollection | undefined = children.value[key]

            if (!val) {
                return emptyErrors
            }

            if (!keys.length) {
                return val
            }

            return val.children(keys.join('.'))
        },
        get(path: ErrorKeyOrKeys): Error[] | undefined {
            const keys = getKeys(path)
            const key = keys.shift()

            if (typeof key === 'undefined') {
                return undefined
            }

            if (!keys.length) {
                return errors.value[key]
            }

            const child = children.value[key]

            if (!child) {
                return undefined
            }

            return child.get(keys.join('.'))
        },
        has(path: ErrorKeyOrKeys): boolean {
            const keys = getKeys(path)
            const key = keys.shift()

            if (typeof key === 'undefined') {
                return false
            }

            if (!keys.length) {
                return !!errors.value[key]
            }

            const child = children.value[key]

            if (!child) {
                return false
            }

            return child.has(keys.join('.'))
        },
        last(path: string): string | undefined {
            const errors = this.get(path)

            if (errors && errors.length) {
                return errors[errors.length - 1]?.message
            }

            return undefined
        },
        merge(withCollection: ErrorCollection): ErrorCollection {
            const newCollection: ErrorCollection = {
                addError(keys: ErrorKey[], e: Error) {
                    collection.addError(keys, e)
                },
                has(path: ErrorKeyOrKeys): boolean {
                    return collection.has(path) || withCollection.has(path)
                },
                children(path: ErrorKeyOrKeys): ErrorCollection {
                    return collection
                        .children(path)
                        .merge(withCollection.children(path))
                },
                get(path: ErrorKeyOrKeys): Error[] {
                    return [
                        ...(collection.get(path) || []),
                        ...(withCollection.get(path) || []),
                    ]
                },
                last(path: ErrorKeyOrKeys): string | undefined {
                    return collection.last(path) || withCollection.last(path)
                },
                merge(withCollection: ErrorCollection): ErrorCollection {
                    return newCollection.merge(withCollection)
                },
                get all(): Error[] {
                    return [...newCollection.all, ...withCollection.all]
                },
            }

            return newCollection
        },
        get all(): Error[] {
            return Object.values(errors.value).reduce((acc, curr) => {
                return [...acc, ...curr]
            }, [])
        },
    }

    backendErrors.forEach((e) =>
        collection.addError(String(e.path || '').split('.'), e),
    )

    return collection
}

if (import.meta.vitest) {
    const { expect, describe, test } = import.meta.vitest

    describe('createErrorCollection', () => {
        const errors: Error[] = [
            {
                message: 'error one',
                path: 'user.username',
            },
            {
                message: 'error two',
                path: 'accessKey',
            },
            {
                message: 'error three',
                path: 'accessKey',
            },
            {
                message: 'first roles field error',
                path: 'user.roles.0',
            },
            {
                message: 'second roles field error',
                path: 'user.roles.1',
            },
            {
                message: 'Password should contain at least one capital letter',
                path: 'user.password.first',
            },
            {
                message:
                    'Password should contain at least one special character',
                path: 'user.password.first',
            },
            {
                message: 'Password should match in both fields',
                path: 'user.password.second',
            },
        ]

        test('A bunch of errors', () => {
            const collection = createErrorCollection(errors)

            expect(collection.last('accessKey')).toBe('error three')
            expect(collection.has('accessKey')).toBe(true)
            expect(collection.last('non-existent')).toBeUndefined()
            expect(collection.has('non-existent')).toBe(false)

            const accessKeyErrors = collection.get('accessKey')
            expect(accessKeyErrors).not.toBeUndefined()
            expect(Array.isArray(accessKeyErrors)).toEqual(true)

            if (typeof accessKeyErrors !== 'undefined') {
                if (accessKeyErrors[0]) {
                    expect(accessKeyErrors[0].message).toBe('error two')
                }

                if (accessKeyErrors[1]) {
                    expect(accessKeyErrors[1].message).toBe('error three')
                }
            }

            expect(collection.last('user.username')).toBe('error one')
            expect(collection.last('user.roles.0')).toBe(
                'first roles field error',
            )
            expect(collection.has('user.roles.0')).toBe(true)
            expect(collection.last('user.roles.1')).toBe(
                'second roles field error',
            )
            expect(collection.has('user.roles.1')).toBe(true)

            const userErrors = collection.children('user')
            if (typeof userErrors !== 'undefined') {
                expect(userErrors.last('roles.0')).toBe(
                    'first roles field error',
                )
                expect(userErrors.has('roles.0')).toBe(true)
                expect(userErrors.last('roles.1')).toBe(
                    'second roles field error',
                )
                expect(userErrors.has('roles.1')).toBe(true)

                const rolesErrors = userErrors.children('roles')
                if (typeof rolesErrors !== 'undefined') {
                    expect(rolesErrors.last(0)).toBe('first roles field error')
                    expect(rolesErrors.has(0)).toBe(true)
                    expect(rolesErrors.last(1)).toBe('second roles field error')
                    expect(rolesErrors.has(1)).toBe(true)
                }
            }

            const rolesErrors = collection.children('user.roles')
            if (typeof rolesErrors !== 'undefined') {
                expect(rolesErrors.last(0)).toBe('first roles field error')
                expect(rolesErrors.has(0)).toBe(true)
                expect(rolesErrors.last(1)).toBe('second roles field error')
                expect(rolesErrors.has(1)).toBe(true)
            }

            expect(collection.last('user.password.first')).toBe(
                'Password should contain at least one special character',
            )
            expect(collection.has('user.password.first')).toBe(true)
            expect(collection.last('user.password.second')).toBe(
                'Password should match in both fields',
            )
            expect(collection.has('user.password.second')).toBe(true)

            // Test that emptyErrors is being reused whenever no errors are found
            const nonExistent = collection.children('user.fieldOne')
            const nonExistentTwo = collection.children('user.fieldTwo')
            expect(nonExistent).toEqual(nonExistentTwo)

            expect(collection.children('non-existent')).toBe(emptyErrors)
            expect(collection.children('non-existent').last('faf')).toBe(
                undefined,
            )
        })

        const errorOne: Error = {
            message: 'error one',
            path: 'MyWhateverQuery.user.username',
        }
        const errorTwo: Error = {
            message: 'error two',
            path: 'user.email',
        }

        test('Test merge', () => {
            const collectionOne = createErrorCollection([errorOne])
            const collectionTwo = createErrorCollection([errorTwo])

            expect(collectionOne.last('MyWhateverQuery.user.username')).toBe(
                'error one',
            )
            expect(collectionOne.has('MyWhateverQuery.user.username')).toBe(
                true,
            )
            expect(collectionTwo.last('user.email')).toBe('error two')
            expect(collectionTwo.has('user.email')).toBe(true)

            const mergedCollection = collectionOne
                .children('MyWhateverQuery')
                .merge(collectionTwo)

            expect(mergedCollection.last('user.username')).toBe('error one')
            expect(mergedCollection.has('user.username')).toBe(true)
            expect(mergedCollection.last('user.email')).toBe('error two')
            expect(mergedCollection.has('user.email')).toBe(true)
        })
    })
}
