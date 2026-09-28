"""Cámara, luz y ajustes de render que comparten render.py y calibrate.py.

Todo lo que define la proyección vive aquí para que el barco y el cubo de
calibración se rendericen con exactamente la misma cámara.
"""
import math

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

# --- Proyección -------------------------------------------------------------
# Dimétrica 2:1: un cuadrado del suelo girado 45° se ve el doble de ancho que
# de alto. La relación ancho/alto de ese rombo es 1/sin(elevación), así que la
# elevación de la cámara es asin(1/2) = 30°. Los 26,57° (= atan(1/2)) son la
# pendiente de las aristas del rombo en la imagen, no la inclinación de la
# cámara: con la cámara a 26,57° el rombo sale 2,236:1. calibrate.py lo mide.
CAMERA_ELEVATION_DEG = 30.0
CAMERA_AZIMUTH_DEG = 45.0

RESOLUTION = 256            # sprite cuadrado, píxeles
ORTHO_SCALE = 2.9           # unidades del mundo que caben a lo ancho del sprite (≈88 px por unidad)
PIVOT_PX = (128.0, 192.0)   # dónde cae el origen del mundo (punto de agua) en el sprite

# --- Render -----------------------------------------------------------------
EEVEE_SAMPLES = 16          # fijo: reproducible entre corridas
FILTER_SIZE_PX = 1.0

# Luz: sol fijo respecto de la cámara (arriba, algo a la izquierda y de frente).
# No gira con el barco: la luz del mundo es una sola para todas las direcciones.
SUN_STRENGTH = 3.2
SUN_ANGLE_DEG = 1.0


def pixels_per_unit():
    return RESOLUTION / ORTHO_SCALE


def camera_up():
    """Vector del mundo que en pantalla apunta hacia arriba (perpendicular a la mirada)."""
    _, toward, _ = camera_basis()
    el = math.radians(CAMERA_ELEVATION_DEG)
    return Vector((-toward.x * math.sin(el), -toward.y * math.sin(el), math.cos(el)))


def screen_offset_px(world_co, ppu=None):
    """Desplazamiento en píxeles (x a la derecha, y hacia abajo) de un punto respecto al origen del mundo."""
    ppu = ppu or pixels_per_unit()
    right, _, _ = camera_basis()
    p = Vector(world_co)
    return (p.dot(right) * ppu, -p.dot(camera_up()) * ppu)


def camera_basis():
    """Vectores del mundo: derecha de pantalla, hacia la cámara (horizontal), adelante de la cámara."""
    az = math.radians(CAMERA_AZIMUTH_DEG)
    el = math.radians(CAMERA_ELEVATION_DEG)
    right = Vector((math.cos(az), math.sin(az), 0.0))
    toward = Vector((math.sin(az), -math.cos(az), 0.0))   # horizontal, del origen hacia la cámara
    forward = Vector((-toward.x * math.cos(el), -toward.y * math.cos(el), -math.sin(el)))
    return right, toward, forward


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    world = bpy.data.worlds.new("world")
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = (0.0, 0.0, 0.0, 1.0)
    bg.inputs["Strength"].default_value = 0.0
    scene.world = world
    return scene


def setup_render(scene, transparent=True, width=RESOLUTION, height=RESOLUTION):
    r = scene.render
    r.engine = "BLENDER_EEVEE"
    r.resolution_x = width
    r.resolution_y = height
    r.resolution_percentage = 100
    r.film_transparent = transparent
    r.filter_size = FILTER_SIZE_PX
    r.dither_intensity = 0.0
    r.use_compositing = False
    r.use_sequencer = False
    r.image_settings.file_format = "PNG"
    r.image_settings.color_mode = "RGBA"
    r.image_settings.color_depth = "8"
    r.image_settings.compression = 90
    # Sin metadatos variables (fecha, tiempo de render): dos corridas dan el mismo PNG byte a byte.
    for attr in dir(r):
        if attr.startswith("use_stamp"):
            setattr(r, attr, False)
    scene.eevee.taa_render_samples = EEVEE_SAMPLES
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.view_settings.exposure = 0.0
    scene.view_settings.gamma = 1.0


def add_camera(scene, width=RESOLUTION, height=RESOLUTION, pivot_px=PIVOT_PX, ppu=None, origin=(0.0, 0.0, 0.0)):
    """Cámara del juego. `origin` (punto del mundo) cae en el píxel `pivot_px` de una imagen width×height.

    Sin `ppu`, la misma densidad que el barco (RESOLUTION / ORTHO_SCALE px por unidad).
    """
    right, toward, forward = camera_basis()
    ortho = ORTHO_SCALE * width / RESOLUTION if ppu is None else width / ppu
    ppu = width / ortho
    el = math.radians(CAMERA_ELEVATION_DEG)
    # El centro de la imagen mira a un punto sobre el origen; el origen cae en pivot_px.
    dy_px = pivot_px[1] - height / 2.0              # cuántos píxeles por debajo del centro
    dx_px = pivot_px[0] - width / 2.0
    target = Vector(origin) + Vector((0.0, 0.0, dy_px / (ppu * math.cos(el)))) - right * (dx_px / ppu)
    cam_data = bpy.data.cameras.new("camera")
    cam_data.type = "ORTHO"
    cam_data.sensor_fit = "HORIZONTAL"             # ortho_scale mide el ancho aunque la imagen sea apaisada o alta
    cam_data.ortho_scale = ortho
    cam_data.clip_start = 0.1
    cam_data.clip_end = 100.0
    cam = bpy.data.objects.new("camera", cam_data)
    cam.location = target - forward * 30.0
    cam.rotation_euler = (math.radians(90.0 - CAMERA_ELEVATION_DEG), 0.0, math.radians(CAMERA_AZIMUTH_DEG))
    scene.collection.objects.link(cam)
    scene.camera = cam
    return cam


def add_sun(scene):
    right, toward, _ = camera_basis()
    to_light = (-0.45 * right + 0.55 * toward + Vector((0, 0, 0.85))).normalized()
    sun_data = bpy.data.lights.new("sun", type="SUN")
    sun_data.energy = SUN_STRENGTH
    sun_data.angle = math.radians(SUN_ANGLE_DEG)
    sun_data.use_shadow = False   # el contorno (casco invertido) envolvería cada pieza en sombra
    sun = bpy.data.objects.new("sun", sun_data)
    sun.rotation_euler = to_light.to_track_quat("Z", "Y").to_euler()
    scene.collection.objects.link(sun)
    return sun


def project_px(scene, cam, world_co):
    """Coordenadas continuas en píxeles: (0,0) esquina superior izquierda, y hacia abajo."""
    v = world_to_camera_view(scene, cam, Vector(world_co))
    return (v.x * scene.render.resolution_x, (1.0 - v.y) * scene.render.resolution_y)


def blender_version():
    return bpy.app.version_string
