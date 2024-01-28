# TL;DR

A Vue.js lib to aid dealing with responses generated by https://packagist.org/packages/wucdbm/filter-bundle

Generally speaking, if you pass an adequate list of `Error` to `createErrorCollection`, you can use it with whatever backend you have

It is your own duty to re-assign the error collection to the ref that's holding it in place whenever you receive a new response

Implement your own composables if using GraphQL where your state and errors each sit in a `ref()` and adapt your error paths

```vue
<template>
    <div>
        <input
            type="text"
            v-model="model.description"
        />
        <p v-if="errors.has('description')">
            {{ errors.last('description') }}
        </p>
    </div>
</template>
<script lang="ts" setup>
import { ref, Ref } from 'vue'
import { createErrorCollection, isBackendError } from 'wucdbm-vue-errors'
import { AxiosResponse } from 'axios'

type MyObj = {
    id: number
    amount: number
    description: string
}

const model: Ref<MyObj> = ref({
    id: 1,
    amount: 0,
    description: 'desc',
})

const api = {
    someApiCall(
        id: number,
        payload: {
            amount: number
            description: string
        },
    ): Promise<AxiosResponse<string>> {
        // whatever
        console.log(id, payload)

        return new Promise((resolve) => resolve('whatever'))
    },
}

const saving: Ref<boolean> = ref(false)
const errors = ref(createErrorCollection([]))

const save = (obj: MyObj) => {
    saving.value = true

    // reset errors before sending
    errors.value = createErrorCollection([])

    api.someApiCall(obj.id, {
        amount: obj.amount,
        description: obj.description,
    })
        .then((response) => {
            // do something - success
        })
        .catch((e) => {
            if (isBackendError(e)) {
                errors.value = createErrorCollection(e.response.data.errors)
                return
            }

            // whatever happened - handle on your own
            alert(e)
        })
        .finally(() => {
            saving.value = false
        })
}
</script>
```

Enjoy.
