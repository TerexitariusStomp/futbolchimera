#!/usr/bin/env ruby
# Adds all files in ios/<AppName>/Resources/ to the Xcode project's resource build phase
require 'xcodeproj'
require 'json'

app_json = JSON.parse(File.read(File.expand_path('../app.json', __dir__)))
project_name = app_json.dig('expo', 'name')&.gsub(/[^a-zA-Z0-9]/, '') || 'LocalChimera'

project_path = File.expand_path("../ios/#{project_name}.xcodeproj", __dir__)
project = Xcodeproj::Project.open(project_path)

target = project.targets.find { |t| t.name == project_name }
abort "#{project_name} target not found" unless target

resources_dir = File.expand_path("../ios/#{project_name}/Resources", __dir__)
abort 'Resources dir not found' unless Dir.exist?(resources_dir)

# Find or create a group for Resources
group = project.main_group.find_subpath("#{project_name}/Resources", true)
group.set_source_tree('<group>')

# Get existing file references to avoid duplicates
existing = group.files.map { |f| f.path }

Dir.foreach(resources_dir) do |entry|
  next if entry == '.' || entry == '..'
  path = File.join(resources_dir, entry)
  next unless File.file?(path)
  next if existing.include?(entry)

  ref = group.new_reference(entry)
  ref.set_source_tree('<group>')
  target.add_resources([ref])
  puts "Added: #{entry}"
end

project.save
puts 'Xcode project updated.'
