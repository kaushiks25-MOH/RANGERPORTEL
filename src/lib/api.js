import { supabase } from './supabase';

/**
 * Submits a report (Sighting or Clearance) with optional Voice Note
 */
export async function submitReport({ 
  count, 
  severity, 
  notes, 
  latitude, 
  longitude, 
  range,
  imageFile,
  voiceFile,
  reportType = 'SIGHTING',
  isClear = false,
  damageDesc = '',
  casualties = 0,
  officerName = '',
  designation = '',
  teamMembers = '',
  bullCount = 0,
  makhnaCount = 0,
  maleGroupCount = 0,
  femaleGroupCount = 0,
  femaleCalfCount = 0,
  singleFemaleCount = 0,
  isDamageCaused = false,
  damageType = '',
  chaseStartTime = '',
  chaseResult = '',
  remarks = ''
}) {
  let imageUrl = null;
  let voiceUrl = null;
  
  // Handle Image Upload
  if (imageFile) {
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `img_${Math.random()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('evidence_photos').upload(fileName, imageFile);
    if (uploadError) throw new Error('Image upload failed: ' + uploadError.message);
    imageUrl = supabase.storage.from('evidence_photos').getPublicUrl(fileName).data.publicUrl;
  }

  // Handle Voice Upload
  if (voiceFile) {
    const fileName = `voice_${Date.now()}.webm`; 
    const { error: voiceError } = await supabase.storage.from('evidence_photos').upload(fileName, voiceFile);
    if (voiceError) throw new Error('Voice upload failed: ' + voiceError.message);
    voiceUrl = supabase.storage.from('evidence_photos').getPublicUrl(fileName).data.publicUrl;
  }
  
  const { data, error } = await supabase
    .from('reports')
    .insert({
      user_id: '00000000-0000-0000-0000-000000000000',
      elephant_count: count || 0,
      severity: severity || 'LOW',
      notes: notes,
      latitude: latitude,
      longitude: longitude,
      range: range,
      image_url: imageUrl,
      voice_url: voiceUrl,
      report_type: reportType,
      is_clear: isClear,
      damage_desc: damageDesc,
      casualties: casualties,
      officer_name: officerName,
      designation: designation,
      team_members: teamMembers,
      bull_count: bullCount,
      makhna_count: makhnaCount,
      male_group_count: maleGroupCount,
      female_group_count: femaleGroupCount,
      female_calf_count: femaleCalfCount,
      single_female_count: singleFemaleCount,
      is_damage_caused: isDamageCaused,
      damage_type: damageType,
      chase_start_time: chaseStartTime || null,
      chase_result: chaseResult,
      remarks: remarks
    })
    .select()
    .single();
    
  if (error) throw new Error('Failed to save report: ' + error.message);
  return data;
}
