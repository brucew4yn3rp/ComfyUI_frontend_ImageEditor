<template>
  <div
    class="relative w-full h-full"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <Load3DScene
      ref="load3DSceneRef"
      :node="node"
      :input-spec="inputSpec"
      :background-color="backgroundColor"
      :show-grid="showGrid"
      :light-intensity="lightIntensity"
      :fov="fov"
      :camera-type="cameraType"
      :show-preview="showPreview"
      :background-image="backgroundImage"
      :up-direction="upDirection"
      :material-mode="materialMode"
      :edge-threshold="edgeThreshold"
      @material-mode-change="listenMaterialModeChange"
      @background-color-change="listenBackgroundColorChange"
      @light-intensity-change="listenLightIntensityChange"
      @fov-change="listenFOVChange"
      @camera-type-change="listenCameraTypeChange"
      @show-grid-change="listenShowGridChange"
      @show-preview-change="listenShowPreviewChange"
      @background-image-change="listenBackgroundImageChange"
      @up-direction-change="listenUpDirectionChange"
      @edge-threshold-change="listenEdgeThresholdChange"
      @recording-status-change="listenRecordingStatusChange"
    />
    <Load3DControls
      :input-spec="inputSpec"
      :background-color="backgroundColor"
      :show-grid="showGrid"
      :show-preview="showPreview"
      :light-intensity="lightIntensity"
      :show-light-intensity-button="showLightIntensityButton"
      :fov="fov"
      :show-f-o-v-button="showFOVButton"
      :show-preview-button="showPreviewButton"
      :camera-type="cameraType"
      :has-background-image="hasBackgroundImage"
      :up-direction="upDirection"
      :material-mode="materialMode"
      :edge-threshold="edgeThreshold"
      @update-background-image="handleBackgroundImageUpdate"
      @switch-camera="switchCamera"
      @toggle-grid="toggleGrid"
      @update-background-color="handleBackgroundColorChange"
      @update-light-intensity="handleUpdateLightIntensity"
      @toggle-preview="togglePreview"
      @update-f-o-v="handleUpdateFOV"
      @update-up-direction="handleUpdateUpDirection"
      @update-material-mode="handleUpdateMaterialMode"
      @update-edge-threshold="handleUpdateEdgeThreshold"
      @export-model="handleExportModel"
    />
    <div
      v-if="showRecordingControls"
      class="absolute top-12 right-2 z-20 pointer-events-auto"
    >
      <RecordingControls
        :node="node"
        :is-recording="isRecording"
        :has-recording="hasRecording"
        :recording-duration="recordingDuration"
        @start-recording="handleStartRecording"
        @stop-recording="handleStopRecording"
        @export-recording="handleExportRecording"
        @clear-recording="handleClearRecording"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import Load3DControls from '@/components/load3d/Load3DControls.vue'
import Load3DScene from '@/components/load3d/Load3DScene.vue'
import RecordingControls from '@/components/load3d/controls/RecordingControls.vue'
import Load3dUtils from '@/extensions/core/load3d/Load3dUtils'
import {
  CameraType,
  Load3DNodeType,
  MaterialMode,
  UpDirection
} from '@/extensions/core/load3d/interfaces'
import type { CustomInputSpec } from '@/schemas/nodeDef/nodeDefSchemaV2'
import type { ComponentWidget } from '@/scripts/domWidget'
import { useToastStore } from '@/stores/toastStore'

const { t } = useI18n()
const { widget } = defineProps<{
  widget: ComponentWidget<string[]>
}>()

const inputSpec = widget.inputSpec as CustomInputSpec

const node = widget.node
const type = inputSpec.type as Load3DNodeType

const backgroundColor = ref('#000000')
const showGrid = ref(true)
const showPreview = ref(false)
const lightIntensity = ref(5)
const showLightIntensityButton = ref(true)
const fov = ref(75)
const showFOVButton = ref(true)
const cameraType = ref<CameraType>('perspective')
const hasBackgroundImage = ref(false)
const backgroundImage = ref('')
const upDirection = ref<UpDirection>('original')
const materialMode = ref<MaterialMode>('original')
const edgeThreshold = ref(85)
const load3DSceneRef = ref<InstanceType<typeof Load3DScene> | null>(null)
const isRecording = ref(false)
const hasRecording = ref(false)
const recordingDuration = ref(0)
const showRecordingControls = ref(!inputSpec.isPreview)

const showPreviewButton = computed(() => {
  return !type.includes('Preview')
})

const handleMouseEnter = () => {
  if (load3DSceneRef.value?.load3d) {
    load3DSceneRef.value.load3d.updateStatusMouseOnScene(true)
  }
}

const handleMouseLeave = () => {
  if (load3DSceneRef.value?.load3d) {
    load3DSceneRef.value.load3d.updateStatusMouseOnScene(false)
  }
}

const handleStartRecording = async () => {
  if (load3DSceneRef.value?.load3d) {
    await load3DSceneRef.value.load3d.startRecording()
    isRecording.value = true
  }
}

const handleStopRecording = () => {
  if (load3DSceneRef.value?.load3d) {
    load3DSceneRef.value.load3d.stopRecording()
    isRecording.value = false
    recordingDuration.value = load3DSceneRef.value.load3d.getRecordingDuration()
    hasRecording.value = recordingDuration.value > 0
  }
}

const handleExportRecording = () => {
  if (load3DSceneRef.value?.load3d) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `${timestamp}-scene-recording.mp4`
    load3DSceneRef.value.load3d.exportRecording(filename)
  }
}

const handleClearRecording = () => {
  if (load3DSceneRef.value?.load3d) {
    load3DSceneRef.value.load3d.clearRecording()
    hasRecording.value = false
    recordingDuration.value = 0
  }
}

const switchCamera = () => {
  cameraType.value =
    cameraType.value === 'perspective' ? 'orthographic' : 'perspective'

  showFOVButton.value = cameraType.value === 'perspective'

  node.properties['Camera Type'] = cameraType.value
}

const togglePreview = (value: boolean) => {
  showPreview.value = value

  node.properties['Show Preview'] = showPreview.value
}

const toggleGrid = (value: boolean) => {
  showGrid.value = value

  node.properties['Show Grid'] = showGrid.value
}

const handleUpdateLightIntensity = (value: number) => {
  lightIntensity.value = value

  node.properties['Light Intensity'] = lightIntensity.value
}

const handleBackgroundImageUpdate = async (file: File | null) => {
  if (!file) {
    hasBackgroundImage.value = false
    backgroundImage.value = ''
    node.properties['Background Image'] = ''
    return
  }

  const resourceFolder = (node.properties['Resource Folder'] as string) || ''

  const subfolder = resourceFolder.trim() ? `3d/${resourceFolder.trim()}` : '3d'

  backgroundImage.value = await Load3dUtils.uploadFile(file, subfolder)

  node.properties['Background Image'] = backgroundImage.value
}

const handleUpdateFOV = (value: number) => {
  fov.value = value

  node.properties['FOV'] = fov.value
}

const handleUpdateEdgeThreshold = (value: number) => {
  edgeThreshold.value = value

  node.properties['Edge Threshold'] = edgeThreshold.value
}

const handleBackgroundColorChange = (value: string) => {
  backgroundColor.value = value

  node.properties['Background Color'] = value
}

const handleUpdateUpDirection = (value: UpDirection) => {
  upDirection.value = value

  node.properties['Up Direction'] = value
}

const handleUpdateMaterialMode = (value: MaterialMode) => {
  materialMode.value = value

  node.properties['Material Mode'] = value
}

const handleExportModel = async (format: string) => {
  if (!load3DSceneRef.value?.load3d) {
    useToastStore().addAlert(t('toastMessages.no3dSceneToExport'))
    return
  }

  try {
    await load3DSceneRef.value.load3d.exportModel(format)
  } catch (error) {
    console.error('Error exporting model:', error)
    useToastStore().addAlert(
      t('toastMessages.failedToExportModel', {
        format: format.toUpperCase()
      })
    )
  }
}

const listenMaterialModeChange = (mode: MaterialMode) => {
  materialMode.value = mode

  showLightIntensityButton.value = mode === 'original'
}

const listenUpDirectionChange = (value: UpDirection) => {
  upDirection.value = value
}

const listenEdgeThresholdChange = (value: number) => {
  edgeThreshold.value = value
}

const listenRecordingStatusChange = (value: boolean) => {
  isRecording.value = value

  if (!value && load3DSceneRef.value?.load3d) {
    recordingDuration.value = load3DSceneRef.value.load3d.getRecordingDuration()
    hasRecording.value = recordingDuration.value > 0
  }
}

const listenBackgroundColorChange = (value: string) => {
  backgroundColor.value = value
}

const listenLightIntensityChange = (value: number) => {
  lightIntensity.value = value
}

const listenFOVChange = (value: number) => {
  fov.value = value
}

const listenCameraTypeChange = (value: CameraType) => {
  cameraType.value = value
  showFOVButton.value = cameraType.value === 'perspective'
}

const listenShowGridChange = (value: boolean) => {
  showGrid.value = value
}

const listenShowPreviewChange = (value: boolean) => {
  showPreview.value = value
}

const listenBackgroundImageChange = (value: string) => {
  backgroundImage.value = value

  if (backgroundImage.value && backgroundImage.value !== '') {
    hasBackgroundImage.value = true
  }
}
</script>
