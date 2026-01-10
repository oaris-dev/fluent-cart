<script setup>
import {defineModel, nextTick, onMounted, ref, watch} from "vue";
import translate from "@/utils/translator/Translator";
import Badge from "@/Bits/Components/Badge.vue";

const model = defineModel();

const props = defineProps({
    name: {
        type: String,
        required: true
    },
    field: {
        type: Object
    },
    fieldKey: {
        type: String
    },
    value: {
        required: true
    },
    variant: {
        type: String
    },
    nesting: {
        type: Boolean,
        default: false
    },
    statePath: {
        type: String
    },
    form: {
        type: Object,
        required: true
    },
    callback: {
        type: Function,
        required: true
    },
    label: {
        type: String
    },
    attribute: {
        required: true
    }
})

const isActive = ref(false);
const siteKey = ref('');
const secretKey = ref('');
const appReady = ref(false);

onMounted(() => {
    if (model.value) {
        isActive.value = model.value.active || 'no';
        siteKey.value = model.value.site_key || '';
        secretKey.value = model.value.secret_key || '';
    } else {
        model.value = {
            active: 'no',
            site_key: '',
            secret_key: ''
        };
    }
    appReady.value = true;
});

watch(() => model.value, (newVal) => {
    if (newVal) {
        isActive.value = newVal.active || 'no';
        siteKey.value = newVal.site_key || '';
        secretKey.value = newVal.secret_key || '';
    }
}, { deep: true });

const updateActive = (value) => {
    if (!model.value || typeof model.value !== 'object') {
        model.value = {};
    }
    nextTick(() => {
        model.value.active = value;
    });
};

const updateSiteKey = (value) => {
    if (!model.value || typeof model.value !== 'object') {
        model.value = {};
    }
    nextTick(() => {
        model.value.site_key = value;
    });
};

const updateSecretKey = (value) => {
    if (!model.value || typeof model.value !== 'object') {
        model.value = {};
    }
    nextTick(() => {
        model.value.secret_key = value;
    });
};

</script>

<template>
    <div v-if="appReady" class="fct-content-card-list-item py-4 px-6">
        <div class="fct-content-card-list-head">
            <div class="flex items-start gap-2 flex-row">
                <h4 class="mb-0">{{ field.title }}</h4>
                <Badge size="small" :type="isActive === 'yes' ? 'active':'inactive'" :hide-icon="true">
                    {{ isActive === 'yes' ? translate('Active') : translate('Inactive') }}
                </Badge>
            </div>
        </div>
        <div class="fct-content-card-list-content" v-if="field.description">
            <p>{{ field.description }}</p>
        </div>

        <div class="fct-content-card-list-action">
            <div class="pr-4">
                <el-switch active-value="yes" inactive-value="no" v-model="isActive" @change="updateActive">
                </el-switch>
            </div>
        </div>

        <div v-if="isActive === 'yes'" class="fct-turnstile-settings mt-6 border-t border-gray-200 dark:border-gray-700">
            <div class="space-y-4 max-w-[600px] p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                    <label class="block text-sm font-medium mb-2">{{ translate('Turnstile Site Key') }}</label>
                    <el-input
                        v-model="siteKey"
                        @input="updateSiteKey"
                        :placeholder="translate('Enter your Turnstile Site Key')"
                        type="text"
                    />
                    <p class="form-note mt-2">
                        {{ translate('Get your Site Key from Cloudflare Dashboard > Turnstile.') }}
                    </p>
                </div>

                <div>
                    <label class="block text-sm font-medium mb-2">{{ translate('Turnstile Secret Key') }}</label>
                    <el-input
                        v-model="secretKey"
                        @input="updateSecretKey"
                        :placeholder="translate('Enter your Turnstile Secret Key')"
                        type="password"
                        show-password
                    />
                    <p class="form-note mt-2">
                        {{ translate('Get your Secret Key from Cloudflare Dashboard > Turnstile. Keep this secret.') }}
                    </p>
                </div>
            </div>
        </div>
    </div>
</template>

