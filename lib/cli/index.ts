#!/usr/bin/env node

import { buildClientAndServer } from './build'
;(async () => {
    buildClientAndServer()
        .then(() => process.exit(0))
        .catch((e: any) => {
            console.error(e)
            process.exit(1)
        })
})()
