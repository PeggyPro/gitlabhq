# frozen_string_literal: true

module Sidekiq
  ##
  # Sidekiq::Component assumes a config instance is available at @config
  module Component # :nodoc:
    attr_reader :config

    def watchdog(last_words)
      yield
    rescue Exception => ex
      handle_exception(ex, {context: last_words})
      raise ex
    end

    def safe_thread(name, &block)
      Thread.new do
        Thread.current.name = "sidekiq.#{name}"
        watchdog(name, &block)
      end
    end

    def logger
      config.logger
    end

    def redis(&block)
      config.redis(&block)
    end

    def tid
      Thread.current["sidekiq_tid"] ||= (Thread.current.object_id ^ ::Process.pid).to_s(36)
    end

    def hostname
      ENV["DYNO"] || Socket.gethostname
    end

    def process_nonce
      @@process_nonce ||= SecureRandom.hex(6)
    end

    def identity
      @@identity ||= "#{hostname}:#{::Process.pid}:#{process_nonce}"
    end

    def handle_exception(ex, ctx = {})
      config.handle_exception(ex, ctx)
    end

    def fire_event(event, options = {})
      oneshot = options.fetch(:oneshot, true)
      reverse = options[:reverse]
      reraise = options[:reraise]
      logger.debug("Firing #{event} event") if oneshot

      arr = config[:lifecycle_events][event]
      arr.reverse! if reverse
      arr.each do |block|
        block.call
      rescue => ex
        handle_exception(ex, {context: "Exception during Sidekiq lifecycle event.", event: event})
        raise ex if reraise
      end
      arr.clear if oneshot # once we've fired an event, we never fire it again
    end

    # When you have a large tree of components, the `inspect` output
    # can get out of hand, especially with lots of Sidekiq::Config
    # references everywhere. We avoid calling `inspect` on more complex
    # state and use `to_s` instead to keep output manageable, #6553
    def inspect
      "#<#{self.class.name} #{
        instance_variables.map do |name|
          value = instance_variable_get(name)
          case value
          when Proc
            "#{name}=#{value}"
          when Sidekiq::Config
            "#{name}=#{value}"
          when Sidekiq::Component
            "#{name}=#{value}"
          else
            "#{name}=#{value.inspect}"
          end
        end.join(", ")
      }>"
    end
  end
end
