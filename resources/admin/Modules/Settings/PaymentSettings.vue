<template>
  <div class="setting-wrap">
    <Card.Container>
      <Card.Header :title="$t('Payment Settings')" border_bottom/>
      <Card.Body>
        <el-skeleton :loading="loading" animated :rows="6"/>
        <div v-if="!loading" class="payment-method-list fct-content-card-list">
          <VueDraggableNext
              v-bind="dragOptions"
              :list="availableGateways"
              item-key="route"
              handle=".drag-handle"
              @end="onDragEnd"
          >
            <div
                v-for="gateway in availableGateways"
                :key="gateway.route"
                :class="gateway?.upcoming ? 'upcoming fct-content-card-list-item' : 'fct-content-card-list-item'"
            >
              <div class="flex items-start gap-3">
                <span class="drag-handle cursor-move text-gray-400 hover:text-gray-600 mt-1 w-7.5 h-7.5" title="Drag to reorder">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 6h8v2H8V6zm0 4h8v2H8v-2zm0 4h8v2H8v-2z"/>
                  </svg>
                </span>
                
                <div @click="() => {
                  if(!gateway?.addon_status?.is_installed && gateway?.addon_source){
                    return;
                  }
                  $router.push({name: gateway.route})
                }" class="cursor-pointer grid gap-2 flex-1">
                  <div class="fct-content-card-list-head" :class="gateway.route">
                    <img :src="gateway.icon" :alt="gateway.admin_title || gateway.title"/>

                    <span v-if="gateway?.tag" class="fct_payment_method_tag">
                      <Badge size="small" status="info" :text="gateway.tag" />
                    </span>

                    <Badge v-if="showBadge(gateway)" size="small" :status="gateway.status ? 'active' : 'disabled'"
                           :hide-icon="true">
                      {{ getBadgeTitle(gateway.status) }}
                    </Badge>
                  </div>

                  <div class="fct-content-card-list-content">
                    <p>{{ gateway.description }}</p>
                  </div>
                </div>

                <div class="fct-content-card-list-action">
                  <div v-if="gateway?.upcoming">
                    {{ translate('Coming Soon!') }}
                  </div>
                 
                  <el-button v-else class="el-button--x-small"
                             @click="() => $router.push({name: gateway.route})">
                    {{ $t('Manage') }}
                    <img v-if="gateway?.requires_pro" :src="appVars?.asset_url + 'images/crown.svg'" alt="pro feature" class="pro-feature-icon">
                  </el-button>
                </div>
              </div>
            </div>
          </VueDraggableNext>
        </div><!-- .payment-method-list -->
      </Card.Body>
    </Card.Container>
  </div><!-- .setting-wrap -->
</template>

<script setup>
import {ref, onMounted, onUnmounted, getCurrentInstance, computed} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import * as Card from '@/Bits/Components/Card/Card.js';
import Badge from "@/Bits/Components/Badge.vue";
import DynamicIcon from "@/Bits/Components/Icons/DynamicIcon.vue";
import Asset from "@/utils/support/Asset";
import translate from "@/utils/translator/Translator";
import { VueDraggableNext } from 'vue-draggable-next';
import AppConfig from "@/utils/Config/AppConfig";


const selfRef = getCurrentInstance().ctx;
const loading = ref(false);
const availableGateways = ref([]);
const route = useRoute();
const router = useRouter();
const installingAddon = ref(null);
const activatingAddon = ref(null);
const isProActive = AppConfig.get('app_config.isProActive');

const dragOptions = computed(() => {
  return {
    animation: 200,
    ghostClass: 'ghost'
  }
});

const showBadge = (gateway) => {
  return (gateway?.upcoming != true) && (!gateway?.requires_pro || (gateway?.requires_pro && isProActive)) && (gateway?.is_addon != true || (gateway?.is_addon && gateway?.addon_status?.is_installed));
};

const getBadgeTitle = (status) => {
  return status === true ? 'active' : 'inactive';
};

const getPaymentMethods = () => {
  loading.value = true;
  selfRef.$get('settings/payment-methods/all', {})
      .then(response => {
        availableGateways.value = response.gateways;
      })
      .catch((e) => {
        console.error(e);
      })
      .finally(() => {
        loading.value = false;
      });
};

const getUpcoming = () => {
  return Asset.getUrl('images/payment-methods/upcoming.png');
}

const onDragEnd = () => {
  // Save the new order
  const order = availableGateways.value.map(g => g.route);
  selfRef.$post('settings/payment-methods/reorder', { order })
      .then(() => {
        // Order saved successfully
      })
      .catch((e) => {
        console.error('Failed to save payment method order:', e);
      });
};

onMounted(() => {
  getPaymentMethods();
});

</script>
<style lang="scss">
.fct_upcoming_badge {
  position: absolute;
  top: 23px;
  right: 139px;
}

.upcoming .fct-content-card-list-head img {
  opacity: 0.6;
}
</style>

